import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

import {
  getMovieDetails,
  getTvDetails,
  tmdbBackdrop,
  tmdbPoster,
} from "@/lib/metadata/tmdb";

export const runtime = "nodejs";

type RequestBody = {
  type: "movie" | "series";
  id: string;
  tmdbId: number;
};

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as Partial<RequestBody>;

    if (
      body.type !== "movie" &&
      body.type !== "series"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "type must be movie or series",
        },
        { status: 400 },
      );
    }

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          error: "id is required",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(body.tmdbId) ||
      body.tmdbId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid TMDB ID",
        },
        { status: 400 },
      );
    }

    if (body.type === "movie") {
      const movie =
        await getMovieDetails(
          body.tmdbId,
        );

      const existing =
        await prisma.movie.findUnique({
          where: {
            id: body.id,
          },
        });

      if (!existing) {
        return NextResponse.json(
          {
            success: false,
            error: "Movie not found",
          },
          { status: 404 },
        );
      }

      const year =
        movie.release_date
          ? Number(
              movie.release_date.slice(
                0,
                4,
              ),
            )
          : null;

      const updated =
        await prisma.movie.update({
          where: {
            id: body.id,
          },
          data: {
            tmdbId: movie.id,
            title: movie.title,
            year,
            overview:
              movie.overview ||
              null,
            poster:
              tmdbPoster(
                movie.poster_path,
              ),
            backdrop:
              tmdbBackdrop(
                movie.backdrop_path,
              ),
            voteAverage:
              movie.vote_average ??
              null,
          },
        });

      return NextResponse.json({
        success: true,
        media: updated,
      });
    }

    const series =
      await getTvDetails(
        body.tmdbId,
      );

    const existing =
      await prisma.series.findUnique({
        where: {
          id: body.id,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Series not found",
        },
        { status: 404 },
      );
    }

    const year =
      series.first_air_date
        ? Number(
            series.first_air_date.slice(
              0,
              4,
            ),
          )
        : null;

    const updated =
      await prisma.series.update({
        where: {
          id: body.id,
        },
        data: {
          tmdbId: series.id,
          title: series.name,
          year,
          overview:
            series.overview ||
            null,
          poster:
            tmdbPoster(
              series.poster_path,
            ),
          backdrop:
            tmdbBackdrop(
              series.backdrop_path,
            ),
          voteAverage:
            series.vote_average ??
            null,
        },
      });

    return NextResponse.json({
      success: true,
      media: updated,
    });
  } catch (error) {
    console.error(
      "Failed to apply TMDB metadata:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to apply metadata",
      },
      { status: 500 },
    );
  }
}