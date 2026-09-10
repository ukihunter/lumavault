import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";

import { getEpisodePlayableFile } from "@/lib/media/episode-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    episodeId: string;
    streamIndex: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const {
      episodeId,
      streamIndex,
    } = await params;

    if (!episodeId) {
      return NextResponse.json(
        {
          success: false,
          error: "Episode ID is required",
        },
        {
          status: 400,
        },
      );
    }

    const stream = Number(streamIndex);

    if (
      !Number.isInteger(stream) ||
      stream < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid subtitle stream index",
        },
        {
          status: 400,
        },
      );
    }

    const filePath =
      await getEpisodePlayableFile(episodeId);

    if (!filePath) {
      return NextResponse.json(
        {
          success: false,
          error: "Episode media file not found",
        },
        {
          status: 404,
        },
      );
    }

    const subtitle =
      await extractSubtitle(
        filePath,
        stream,
      );

    return new Response(
      new Uint8Array(subtitle),
      {
        status: 200,
        headers: {
          "Content-Type":
            "text/vtt; charset=utf-8",
          "Cache-Control":
            "public, max-age=3600",
          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
  } catch (error) {
    console.error(
      "[LumaVault] Failed to extract embedded subtitle:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to extract subtitle",
      },
      {
        status: 500,
      },
    );
  }
}

function extractSubtitle(
  filePath: string,
  streamIndex: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",

        "-i",
        filePath,

        "-map",
        `0:${streamIndex}`,

        "-f",
        "webvtt",

        "pipe:1",
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const chunks: Buffer[] = [];
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
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