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
        progress: true,
        season: {
          include: {
            series: true,
          },
        },
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

    return NextResponse.json({
      success: true,
      episode,
    });
  } catch (error) {
    console.error(
      "GET /api/episodes/[episodeId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load episode",
      },
      { status: 500 },
    );
  }
}