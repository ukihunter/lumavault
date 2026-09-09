import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{
    libraryId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const { libraryId } = await params;

    const library = await prisma.library.findUnique({
      where: {
        id: libraryId,
      },
      include: {
        series: {
          orderBy: {
            title: "asc",
          },
          include: {
            seasons: {
              orderBy: {
                number: "asc",
              },
              include: {
                episodes: {
                  orderBy: {
                    number: "asc",
                  },
                  include: {
                    mediaSource: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!library) {
      return NextResponse.json(
        {
          success: false,
          error: "Library not found",
        },
        { status: 404 },
      );
    }

    const series = library.series.map((show) => ({
      id: show.id,
      title: show.title,
      description: show.description,
      year: show.year,
      poster: show.poster,
      backdrop: show.backdrop,

      seasons: show.seasons.map((season) => ({
        id: season.id,
        number: season.number,
        title: season.title,

        episodes: season.episodes.map((episode) => ({
          id: episode.id,
          number: episode.number,
          title: episode.title,
          description: episode.description,
          thumbnail: episode.thumbnail,
          duration: episode.duration,

          mediaSource: episode.mediaSource
            ? {
                id: episode.mediaSource.id,
                type: episode.mediaSource.type,
                filePath: episode.mediaSource.filePath,
                archivePath: episode.mediaSource.archivePath,
                entryPath: episode.mediaSource.entryPath,
              }
            : null,
        })),
      })),
    }));

    const totalSeasons = series.reduce(
      (total, show) => total + show.seasons.length,
      0,
    );

    const totalEpisodes = series.reduce(
      (total, show) =>
        total +
        show.seasons.reduce(
          (seasonTotal, season) =>
            seasonTotal + season.episodes.length,
          0,
        ),
      0,
    );

    const archiveEpisodes = series.reduce(
      (total, show) =>
        total +
        show.seasons.reduce(
          (seasonTotal, season) =>
            seasonTotal +
            season.episodes.filter(
              (episode) =>
                episode.mediaSource?.type === "ARCHIVE",
            ).length,
          0,
        ),
      0,
    );

    const fileEpisodes = series.reduce(
      (total, show) =>
        total +
        show.seasons.reduce(
          (seasonTotal, season) =>
            seasonTotal +
            season.episodes.filter(
              (episode) =>
                episode.mediaSource?.type === "FILE",
            ).length,
          0,
        ),
      0,
    );

    return NextResponse.json({
      success: true,

      library: {
        id: library.id,
        name: library.name,
        path: library.path,
        type: library.type,
      },

      stats: {
        series: series.length,
        seasons: totalSeasons,
        episodes: totalEpisodes,
        archiveEpisodes,
        fileEpisodes,
      },

      series,
    });
  } catch (error) {
    console.error(
      "GET /api/library/[libraryId]/inspect error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to inspect library",
      },
      { status: 500 },
    );
  }
}