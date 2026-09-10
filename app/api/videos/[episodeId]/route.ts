import "server-only";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import { NextRequest, NextResponse } from "next/server";

import { getEpisodePlayableFile } from "@/lib/media/episode-source";
import { probeMediaFile } from "@/lib/media/ffprobe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Range = {
  start: number;
  end: number;
};

const remuxJobs = new Map<
  string,
  Promise<string>
>();

function getAudioCacheDirectory() {
  const configured =
    process.env.LUMAVAULT_CACHE_DIR?.trim();

  const base =
    configured ||
    path.join(
      process.env.HOME || process.cwd(),
      ".cache",
      "lumavault",
      "media",
    );

  return path.join(base, "audio");
}

function createHash(value: string) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function parseRange(
  header: string | null,
  size: number,
): Range | null {
  if (!header) {
    return null;
  }

  if (!header.startsWith("bytes=")) {
    return null;
  }

  const value =
    header.slice("bytes=".length).trim();

  /*
   * We intentionally support one range only.
   * This is enough for normal HTML5 video playback.
   */
  if (value.includes(",")) {
    return null;
  }

  const [startText, endText] =
    value.split("-");

  let start: number;
  let end: number;

  /*
   * bytes=-500
   */
  if (startText === "") {
    const suffix = Number(endText);

    if (
      !Number.isFinite(suffix) ||
      suffix <= 0
    ) {
      return null;
    }

    start = Math.max(
      size - suffix,
      0,
    );

    end = size - 1;
  } else {
    start = Number(startText);

    if (
      !Number.isFinite(start) ||
      start < 0
    ) {
      return null;
    }

    if (endText === "") {
      end = size - 1;
    } else {
      end = Number(endText);

      if (
        !Number.isFinite(end) ||
        end < start
      ) {
        return null;
      }

      end = Math.min(
        end,
        size - 1,
      );
    }
  }

  if (
    start >= size ||
    start < 0 ||
    end < start
  ) {
    return null;
  }

  return {
    start,
    end,
  };
}

function serveFile(
  request: NextRequest,
  filePath: string,
): Response {
  const stat = fs.statSync(filePath);

  const size = stat.size;

  if (size <= 0) {
    return new Response(null, {
      status: 404,
    });
  }

  const rangeHeader =
    request.headers.get("range");

  /*
   * Browser requested a byte range.
   */
  if (rangeHeader) {
    const range = parseRange(
      rangeHeader,
      size,
    );

    if (!range) {
      return new Response(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${size}`,
          "Accept-Ranges": "bytes",
        },
      });
    }

    const contentLength =
      range.end - range.start + 1;

    if (request.method === "HEAD") {
      return new Response(null, {
        status: 206,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length":
            String(contentLength),
          "Content-Range":
            `bytes ${range.start}-${range.end}/${size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control":
            "private, max-age=3600",
        },
      });
    }

    const stream =
      fs.createReadStream(filePath, {
        start: range.start,
        end: range.end,
      });

    return new Response(
      stream as unknown as BodyInit,
      {
        status: 206,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length":
            String(contentLength),
          "Content-Range":
            `bytes ${range.start}-${range.end}/${size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control":
            "private, max-age=3600",
        },
      },
    );
  }

  /*
   * Browser requested entire file.
   */
  if (request.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(size),
        "Accept-Ranges": "bytes",
        "Cache-Control":
          "private, max-age=3600",
      },
    });
  }

  const stream =
    fs.createReadStream(filePath);

  return new Response(
    stream as unknown as BodyInit,
    {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(size),
        "Accept-Ranges": "bytes",
        "Cache-Control":
          "private, max-age=3600",
      },
    },
  );
}

function runFfmpeg(
  inputPath: string,
  outputPath: string,
  audioStreamIndex: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",

      "-i",
      inputPath,

      /*
       * First video stream.
       */
      "-map",
      "0:v:0",

      /*
       * Exact global FFmpeg stream index.
       */
      "-map",
      `0:${audioStreamIndex}`,

      /*
       * No video transcoding.
       */
      "-c:v",
      "copy",

      /*
       * No audio transcoding.
       */
      "-c:a",
      "copy",

      /*
       * Make MP4 seekable immediately.
       */
      "-movflags",
      "+faststart",

      "-y",
      outputPath,
    ];

    console.log(
      `[LumaVault] FFmpeg audio remux: stream ${audioStreamIndex}`,
    );

    const child = spawn(
      "ffmpeg",
      args,
      {
        stdio: ["ignore", "ignore", "pipe"],
      },
    );

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `FFmpeg exited with code ${code}: ${stderr.trim()}`,
        ),
      );
    });
  });
}

async function getAudioCache(
  episodeId: string,
  filePath: string,
  audioStreamIndex: number,
) {
  const sourceStat =
    await fs.promises.stat(filePath);

  const key = createHash(
    [
      episodeId,
      filePath,
      sourceStat.size,
      sourceStat.mtimeMs,
      audioStreamIndex,
    ].join("|"),
  );

  const directory =
    getAudioCacheDirectory();

  await fs.promises.mkdir(
    directory,
    {
      recursive: true,
    },
  );

  const outputPath = path.join(
    directory,
    `${key}.mp4`,
  );

  /*
   * Persistent cache hit.
   */
  try {
    const stat =
      await fs.promises.stat(
        outputPath,
      );

    if (stat.size > 0) {
      console.log(
        `[LumaVault] Audio cache hit: ${outputPath}`,
      );

      return outputPath;
    }
  } catch {
    // Cache doesn't exist.
  }

  /*
   * Avoid two simultaneous FFmpeg jobs
   * creating the same cache file.
   */
  const existing =
    remuxJobs.get(outputPath);

  if (existing) {
    console.log(
      `[LumaVault] Waiting for audio cache: ${outputPath}`,
    );

    return existing;
  }

  /*
   * IMPORTANT:
   *
   * Temporary filename ends in .mp4.
   * FFmpeg therefore knows the output container.
   */
  const temporaryPath = path.join(
    directory,
    `${key}.${process.pid}.${Date.now()}.tmp.mp4`,
  );

  const job = (async () => {
    try {
      await fs.promises.rm(
        temporaryPath,
        {
          force: true,
        },
      );

      await runFfmpeg(
        filePath,
        temporaryPath,
        audioStreamIndex,
      );

      const stat =
        await fs.promises.stat(
          temporaryPath,
        );

      if (stat.size <= 0) {
        throw new Error(
          "Generated audio cache is empty",
        );
      }

      /*
       * Atomic replacement.
       */
      await fs.promises.rename(
        temporaryPath,
        outputPath,
      );

      console.log(
        `[LumaVault] Audio cache created: ${outputPath}`,
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
  })();

  remuxJobs.set(
    outputPath,
    job,
  );

  try {
    return await job;
  } finally {
    remuxJobs.delete(
      outputPath,
    );
  }
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      episodeId: string;
    }>;
  },
) {
  try {
    const { episodeId } =
      await params;

    if (!episodeId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Episode ID is required",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Resolve BOTH FILE and ARCHIVE sources.
     *
     * For ARCHIVE this gives us the persistent
     * extracted media cache.
     */
    const filePath =
      await getEpisodePlayableFile(
        episodeId,
      );

    if (!filePath) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Episode media file not found",
        },
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
     * --------------------------------------------------
     * NORMAL PLAYBACK
     * --------------------------------------------------
     */
    if (audioParameter === null) {
      return serveFile(
        request,
        filePath,
      );
    }

    /*
     * --------------------------------------------------
     * AUDIO SWITCHING
     * --------------------------------------------------
     */

    const audioStreamIndex =
      Number(audioParameter);

    if (
      !Number.isInteger(
        audioStreamIndex,
      ) ||
      audioStreamIndex < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid audio stream index",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Verify that the requested stream is
     * actually an audio stream.
     */
    const tracks =
      await probeMediaFile(
        filePath,
      );

    const audioTrack =
      tracks.audio.find(
        (track) =>
          track.streamIndex ===
          audioStreamIndex,
      );

    if (!audioTrack) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Audio stream ${audioStreamIndex} was not found`,
        },
        {
          status: 404,
        },
      );
    }

    console.log(
      "[LumaVault] Selected audio:",
      {
        streamIndex:
          audioTrack.streamIndex,
        language:
          audioTrack.language,
        label:
          audioTrack.label,
        codec:
          audioTrack.codec,
        channels:
          audioTrack.channels,
      },
    );

    const cachedPath =
      await getAudioCache(
        episodeId,
        filePath,
        audioStreamIndex,
      );

    return serveFile(
      request,
      cachedPath,
    );
  } catch (error) {
    console.error(
      "[LumaVault] Video route error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to serve video",
      },
      {
        status: 500,
      },
    );
  }
}

export async function HEAD(
  request: NextRequest,
  context: {
    params: Promise<{
      episodeId: string;
    }>;
  },
) {
  return GET(
    request,
    context,
  );
}