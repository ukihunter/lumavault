
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/db/prisma";

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest,
) {
  try {
    const movieId =
      request.nextUrl.searchParams.get(
        "movieId",
      );

    const episodeId =
      request.nextUrl.searchParams.get(
        "episodeId",
      );

    /* ---------------------------------------------------------------------- */
    /* Get one movie's progress                                               */
    /* ---------------------------------------------------------------------- */

    if (movieId) {
      const progress =
        await prisma.progress.findUnique({
          where: {
            movieId,
          },
          select: {
            id: true,
            position: true,
            completed: true,
            updatedAt: true,

            movie: {
              select: {
                id: true,
                title: true,
                duration: true,
                poster: true,
                backdrop: true,
              },
            },
          },
        });

      return NextResponse.json({
        success: true,
        progress,
      });
    }

    /* ---------------------------------------------------------------------- */
    /* Get one episode's progress                                             */
    /* ---------------------------------------------------------------------- */

    if (episodeId) {
      const progress =
        await prisma.progress.findUnique({
          where: {
            episodeId,
          },
          select: {
            id: true,
            position: true,
            completed: true,
            updatedAt: true,

            episode: {
              select: {
                id: true,
                number: true,
                title: true,
                duration: true,
                thumbnail: true,

                season: {
                  select: {
                    number: true,

                    series: {
                      select: {
                        id: true,
                        title: true,
                        poster: true,
                        backdrop: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

      return NextResponse.json({
        success: true,
        progress,
      });
    }

    /* ---------------------------------------------------------------------- */
    /* Get all unfinished progress                                            */
    /* ---------------------------------------------------------------------- */

    const progress =
      await prisma.progress.findMany({
        where: {
          completed: false,
          position: {
            gt: 0,
          },
          OR: [
            {
              movieId: {
                not: null,
              },
            },
            {
              episodeId: {
                not: null,
              },
            },
          ],
        },

        orderBy: {
          updatedAt: "desc",
        },

        select: {
          id: true,
          position: true,
          completed: true,
          updatedAt: true,

          movie: {
            select: {
              id: true,
              title: true,
              duration: true,
              poster: true,
              backdrop: true,
            },
          },

          episode: {
            select: {
              id: true,
              number: true,
              title: true,
              duration: true,
              thumbnail: true,

              season: {
                select: {
                  number: true,

                  series: {
                    select: {
                      id: true,
                      title: true,
                      poster: true,
                      backdrop: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      progress,
      count: progress.length,
    });
  } catch (error) {
    console.error(
      "GET /api/progress error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load progress",
      },
      {
        status: 500,
      },
    );
  }
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      await request.json();

    const movieId =
      typeof body.movieId === "string"
        ? body.movieId.trim()
        : "";

    const episodeId =
      typeof body.episodeId === "string"
        ? body.episodeId.trim()
        : "";

    const position = Number(
      body.position ?? 0,
    );

    const completed =
      body.completed === true;

    /* ---------------------------------------------------------------------- */
    /* Validate content target                                                */
    /* ---------------------------------------------------------------------- */

    if (
      (movieId && episodeId) ||
      (!movieId && !episodeId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Provide exactly one of movieId or episodeId",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(position) ||
      position < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid position",
        },
        {
          status: 400,
        },
      );
    }

    const normalizedPosition =
      Math.floor(position);

    /* ---------------------------------------------------------------------- */
    /* Movie progress                                                         */
    /* ---------------------------------------------------------------------- */

    if (movieId) {
      const movie =
        await prisma.movie.findUnique({
          where: {
            id: movieId,
          },
          select: {
            id: true,
          },
        });

      if (!movie) {
        return NextResponse.json(
          {
            success: false,
            error: "Movie not found",
          },
          {
            status: 404,
          },
        );
      }

      /*
       * Completed movies are removed from
       * Continue Watching.
       */
      if (completed) {
        await prisma.progress.deleteMany({
          where: {
            movieId,
          },
        });

        return NextResponse.json({
          success: true,
          progress: null,
        });
      }

      const progress =
        await prisma.progress.upsert({
          where: {
            movieId,
          },

          create: {
            movieId,
            position:
              normalizedPosition,
            completed: false,
          },

          update: {
            position:
              normalizedPosition,
            completed: false,
          },

          select: {
            id: true,
            position: true,
            completed: true,
            updatedAt: true,
          },
        });

      return NextResponse.json({
        success: true,
        progress,
      });
    }

    /* ---------------------------------------------------------------------- */
    /* Episode progress                                                       */
    /* ---------------------------------------------------------------------- */

    const episode =
      await prisma.episode.findUnique({
        where: {
          id: episodeId,
        },
        select: {
          id: true,
        },
      });

    if (!episode) {
      return NextResponse.json(
        {
          success: false,
          error: "Episode not found",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Completed episodes are removed from
     * Continue Watching.
     */
    if (completed) {
      await prisma.progress.deleteMany({
        where: {
          episodeId,
        },
      });

      return NextResponse.json({
        success: true,
        progress: null,
      });
    }

    const progress =
      await prisma.progress.upsert({
        where: {
          episodeId,
        },

        create: {
          episodeId,
          position:
            normalizedPosition,
          completed: false,
        },

        update: {
          position:
            normalizedPosition,
          completed: false,
        },

        select: {
          id: true,
          position: true,
          completed: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error(
      "POST /api/progress error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save progress",
      },
      {
        status: 500,
      },
    );
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE                                                                     */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  request: NextRequest,
) {
  try {
    const movieId =
      request.nextUrl.searchParams.get(
        "movieId",
      );

    const episodeId =
      request.nextUrl.searchParams.get(
        "episodeId",
      );

    if (!movieId && !episodeId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "movieId or episodeId is required",
        },
        {
          status: 400,
        },
      );
    }

    if (movieId) {
      await prisma.progress.deleteMany({
        where: {
          movieId,
        },
      });
    }

    if (episodeId) {
      await prisma.progress.deleteMany({
        where: {
          episodeId,
        },
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/progress error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete progress",
      },
      {
        status: 500,
      },
    );
  }
}

