import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{
    seriesId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const { seriesId } = await params;

    const series = await prisma.series.findUnique({
      where: {
        id: seriesId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        year: true,
        poster: true,
        backdrop: true,

        library: {
          select: {
            id: true,
            name: true,
            path: true,
            type: true,
          },
        },

        seasons: {
          orderBy: {
            number: "asc",
          },
          select: {
            id: true,
            number: true,
            title: true,

            episodes: {
              orderBy: {
                number: "asc",
              },
              select: {
                id: true,
                number: true,
                title: true,
                description: true,
                thumbnail: true,
                duration: true,

                mediaSource: {
                  select: {
                    id: true,
                    type: true,
                    filePath: true,
                    archivePath: true,
                    entryPath: true,
                  },
                },

                progress: {
                  select: {
                    position: true,
                    completed: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
        },

        createdAt: true,
        updatedAt: true,
      },
    });

    if (!series) {
      return NextResponse.json(
        {
          success: false,
          error: "Series not found",
        },
        { status: 404 },
      );
    }

    const totalEpisodes = series.seasons.reduce(
      (total, season) => total + season.episodes.length,
      0,
    );

    return NextResponse.json({
      success: true,
      series,
      stats: {
        seasons: series.seasons.length,
        episodes: totalEpisodes,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/series/[seriesId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load series",
      },
      { status: 500 },
    );
  }
}