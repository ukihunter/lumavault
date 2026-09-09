import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

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

    const episode = await prisma.episode.findUnique({
      where: {
        id: episodeId,
      },
      include: {
        mediaSource: true,
      },
    });

    if (!episode) {
      return NextResponse.json(
        {
          success: false,
          error: "Episode not found",
        },
        { status: 404 },
      );
    }

    if (!episode.mediaSource) {
      return NextResponse.json(
        {
          success: false,
          error: "Episode has no media source",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      episodeId: episode.id,
      mediaSource: episode.mediaSource,
      message: "Streaming engine not implemented yet",
    });
  } catch (error) {
    console.error(
      "GET /api/videos/[episodeId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load video source",
      },
      { status: 500 },
    );
  }
}