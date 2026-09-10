import { NextResponse } from "next/server";

import { probeMediaFile } from "@/lib/media/ffprobe";
import { getEpisodePlayableFile } from "@/lib/media/episode-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    episodeId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const { episodeId } = await params;

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

    const tracks =
      await probeMediaFile(filePath);

    /*
     * IMPORTANT:
     *
     * Empty subtitle/audio arrays are completely valid.
     * Do not turn them into errors.
     */
    return NextResponse.json({
      success: true,
      audio: Array.isArray(tracks.audio)
        ? tracks.audio
        : [],
      subtitles: Array.isArray(tracks.subtitles)
        ? tracks.subtitles
        : [],
    });
  } catch (error) {
    console.error(
      "[LumaVault] Failed to inspect episode tracks:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to inspect episode tracks",
      },
      {
        status: 500,
      },
    );
  }
}