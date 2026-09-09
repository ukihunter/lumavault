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
        _count: {
          select: {
            movies: true,
            series: true,
          },
        },
        series: {
          orderBy: {
            title: "asc",
          },
          include: {
            _count: {
              select: {
                seasons: true,
              },
            },
            seasons: {
              orderBy: {
                number: "asc",
              },
              include: {
                _count: {
                  select: {
                    episodes: true,
                  },
                },
              },
            },
          },
        },
        movies: {
          orderBy: {
            title: "asc",
          },
          include: {
            mediaSource: true,
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

    /*
     * Count episodes across all seasons.
     */
    const episodeCount = await prisma.episode.count({
      where: {
        season: {
          series: {
            libraryId,
          },
        },
      },
    });

    /*
     * Count media sources belonging to this library's
     * movies and episodes.
     */
    const movieSourceCount =
      await prisma.mediaSource.count({
        where: {
          movie: {
            libraryId,
          },
        },
      });

    const episodeSourceCount =
      await prisma.mediaSource.count({
        where: {
          episode: {
            season: {
              series: {
                libraryId,
              },
            },
          },
        },
      });

    const archiveSourceCount =
      await prisma.mediaSource.count({
        where: {
          type: "ARCHIVE",
          OR: [
            {
              movie: {
                libraryId,
              },
            },
            {
              episode: {
                season: {
                  series: {
                    libraryId,
                  },
                },
              },
            },
          ],
        },
      });

    const fileSourceCount =
      await prisma.mediaSource.count({
        where: {
          type: "FILE",
          OR: [
            {
              movie: {
                libraryId,
              },
            },
            {
              episode: {
                season: {
                  series: {
                    libraryId,
                  },
                },
              },
            },
          ],
        },
      });

    return NextResponse.json({
      success: true,

      library: {
        id: library.id,
        name: library.name,
        type: library.type,
        path: library.path,
      },

      summary: {
        movies: library._count.movies,
        series: library._count.series,
        seasons: library.series.reduce(
          (total, series) =>
            total + series._count.seasons,
          0,
        ),
        episodes: episodeCount,

        mediaSources:
          movieSourceCount +
          episodeSourceCount,

        archiveSources: archiveSourceCount,
        fileSources: fileSourceCount,
      },

      series: library.series.map((series) => ({
        id: series.id,
        title: series.title,
        year: series.year,

        seasons: series.seasons.map(
          (season) => ({
            id: season.id,
            number: season.number,
            title: season.title,
            episodes:
              season._count.episodes,
          }),
        ),
      })),

      movies: library.movies.map(
        (movie) => ({
          id: movie.id,
          title: movie.title,
          year: movie.year,

          mediaSource: movie.mediaSource
            ? {
                type: movie.mediaSource.type,
                filePath:
                  movie.mediaSource.filePath,
                archivePath:
                  movie.mediaSource.archivePath,
                entryPath:
                  movie.mediaSource.entryPath,
              }
            : null,
        }),
      ),
    });
  } catch (error) {
    console.error(
      "GET /api/library/[libraryId]/stats error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to inspect library.",
      },
      { status: 500 },
    );
  }
}