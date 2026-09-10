import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_DIR = path.join(
  os.tmpdir(),
  "lumavault-audio-cache",
);

const MIME_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".ogv": "video/ogg",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
};

function getMimeType(filePath: string) {
  return (
    MIME_TYPES[path.extname(filePath).toLowerCase()] ??
    "application/octet-stream"
  );
}

function parseRange(
  rangeHeader: string | null,
  size: number,
) {
  if (!rangeHeader) return null;

  const match = rangeHeader.match(
    /^bytes=(\d*)-(\d*)$/,
  );

  if (!match) return null;

  const startText = match[1];
  const endText = match[2];

  let start: number;
  let end: number;

  if (startText === "") {
    const suffixLength = Number(endText);

    if (
      !Number.isFinite(suffixLength) ||
      suffixLength <= 0
    ) {
      return null;
    }

    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(startText);

    if (!Number.isFinite(start) || start < 0) {
      return null;
    }

    if (endText === "") {
      end = size - 1;
    } else {
      end = Number(endText);

      if (!Number.isFinite(end)) {
        return null;
      }

      end = Math.min(end, size - 1);
    }
  }

  if (start >= size || start > end) {
    return null;
  }

  return {
    start,
    end,
  };
}

function streamFile(
  filePath: string,
  request: NextRequest,
) {
  const stat = fs.statSync(filePath);
  const size = stat.size;
  const rangeHeader = request.headers.get("range");

  const range = parseRange(rangeHeader, size);

  const headers = new Headers();

  headers.set(
    "Content-Type",
    getMimeType(filePath),
  );

  headers.set(
    "Accept-Ranges",
    "bytes",
  );

  headers.set(
    "Cache-Control",
    "private, max-age=0, must-revalidate",
  );

  headers.set(
    "X-Content-Type-Options",
    "nosniff",
  );

  if (!range) {
    headers.set(
      "Content-Length",
      String(size),
    );

    return new Response(
      fs.createReadStream(filePath) as unknown as ReadableStream,
      {
        status: 200,
        headers,
      },
    );
  }

  const { start, end } = range;
  const contentLength = end - start + 1;

  headers.set(
    "Content-Length",
    String(contentLength),
  );

  headers.set(
    "Content-Range",
    `bytes ${start}-${end}/${size}`,
  );

  return new Response(
    fs.createReadStream(filePath, {
      start,
      end,
    }) as unknown as ReadableStream,
    {
      status: 206,
      headers,
    },
  );
}

async function getEpisodeSource(
  episodeId: string,
) {
  return prisma.episode.findUnique({
    where: {
      id: episodeId,
    },
    select: {
      id: true,
      mediaSource: {
        select: {
          type: true,
          filePath: true,
          archivePath: true,
          entryPath: true,
        },
      },
    },
  });
}

function runFfmpegRemux(
  inputPath: string,
  outputPath: string,
  audioStreamIndex: number,
) {
  return new Promise<void>((resolve, reject) => {
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",

      "-i",
      inputPath,

      // Keep the first video stream.
      "-map",
      "0:v:0",

      // Select requested audio stream.
      "-map",
      `0:${audioStreamIndex}`,

      // IMPORTANT:
      // No video transcoding.
      "-c:v",
      "copy",

      // No audio transcoding.
      "-c:a",
      "copy",

      // MP4 needs a fragmented layout when writing to a file
      // that will subsequently be served over HTTP.
      "-movflags",
      "+faststart",

      "-y",
      outputPath,
    ];

    console.log(
      `[LumaVault] Remuxing audio stream ${audioStreamIndex}`,
    );

    const ffmpeg = spawn(
      "ffmpeg",
      args,
      {
        stdio: [
          "ignore",
          "ignore",
          "pipe",
        ],
      },
    );

    let stderr = "";

    ffmpeg.stderr.on(
      "data",
      (chunk: Buffer) => {
        stderr += chunk.toString();
      },
    );

    ffmpeg.on(
      "error",
      (error) => {
        reject(error);
      },
    );

    ffmpeg.on(
      "close",
      (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(
          new Error(
            stderr.trim() ||
              `FFmpeg exited with code ${code}`,
          ),
        );
      },
    );
  });
}

async function getRemuxedFile(
  inputPath: string,
  audioStreamIndex: number,
) {
  await fs.promises.mkdir(
    CACHE_DIR,
    {
      recursive: true,
    },
  );

  const stat = await fs.promises.stat(
    inputPath,
  );

  const cacheKey = crypto
    .createHash("sha256")
    .update(
      `${inputPath}|${stat.size}|${stat.mtimeMs}|audio:${audioStreamIndex}`,
    )
    .digest("hex");

  const outputPath = path.join(
    CACHE_DIR,
    `${cacheKey}.mp4`,
  );

  if (
    fs.existsSync(outputPath)
  ) {
    return outputPath;
  }

  const temporaryPath =
    `${outputPath}.${process.pid}.${Date.now()}.tmp`;

  try {
    await runFfmpegRemux(
      inputPath,
      temporaryPath,
      audioStreamIndex,
    );

    await fs.promises.rename(
      temporaryPath,
      outputPath,
    );

    return outputPath;
  } catch (error) {
    await fs.promises.rm(
      temporaryPath,
      {
        force: true,
      },
    );

    throw error;
  }
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      episodeId: string;
    }>;
  },
) {
  try {
    const { episodeId } =
      await context.params;

    if (!episodeId) {
      return new Response(
        "Episode ID is required",
        {
          status: 400,
        },
      );
    }

    const episode =
      await getEpisodeSource(
        episodeId,
      );

    if (
      !episode ||
      !episode.mediaSource
    ) {
      return new Response(
        "Episode media not found",
        {
          status: 404,
        },
      );
    }

    const source =
      episode.mediaSource;

    /*
     * ------------------------------------------------------------
     * FILE SOURCE
     * ------------------------------------------------------------
     */

    if (
      source.type === "FILE"
    ) {
      if (!source.filePath) {
        return new Response(
          "Episode file path is missing",
          {
            status: 404,
          },
        );
      }

      if (
        !fs.existsSync(
          source.filePath,
        )
      ) {
        return new Response(
          "Episode media file does not exist",
          {
            status: 404,
          },
        );
      }

      const audioParameter =
        request.nextUrl.searchParams.get(
          "audio",
        );

      /*
       * Normal playback:
       *
       * /api/videos/episodeId
       */
      if (
        audioParameter === null ||
        audioParameter === ""
      ) {
        return streamFile(
          source.filePath,
          request,
        );
      }

      /*
       * Audio switching:
       *
       * /api/videos/episodeId?audio=1
       *
       * The value is the FFmpeg stream index returned
       * by the /tracks endpoint.
       */
      const audioStreamIndex =
        Number(audioParameter);

      if (
        !Number.isInteger(
          audioStreamIndex,
        ) ||
        audioStreamIndex < 0
      ) {
        return new Response(
          "Invalid audio stream index",
          {
            status: 400,
          },
        );
      }

      const remuxedFile =
        await getRemuxedFile(
          source.filePath,
          audioStreamIndex,
        );

      return streamFile(
        remuxedFile,
        request,
      );
    }

    /*
     * ------------------------------------------------------------
     * ARCHIVE SOURCE
     * ------------------------------------------------------------
     *
     * Keep archive playback handled by your existing archive
     * implementation. Audio remuxing of ZIP entries requires
     * extraction/cache handling and is intentionally not guessed
     * here.
     */

    return new Response(
      "Archive episode playback is handled by the archive media route. Audio switching for archive entries is not available yet.",
      {
        status: 501,
      },
    );
  } catch (error) {
    console.error(
      "[LumaVault] Episode video error:",
      error,
    );

    return new Response(
      error instanceof Error
        ? error.message
        : "Failed to stream episode",
      {
        status: 500,
      },
    );
  }
}