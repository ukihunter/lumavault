import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

import {
  matchMovie,
  matchSeries,
} from "@/lib/metadata/match";

export async function POST() {
  try {
    const movies = await prisma.movie.findMany({
      where: {
        OR: [
          { poster: null },
          { backdrop: null },
        ],
      },
      select: {
        id: true,
        title: true,
        year: true,
      },
    });

    const series = await prisma.series.findMany({
      where: {
        OR: [
          { poster: null },
          { backdrop: null },
        ],
      },
      select: {
        id: true,
        title: true,
        year: true,
      },
    });

    let moviesMatched = 0;
    let seriesMatched = 0;

    const errors: string[] = [];

    for (const movie of movies) {
      try {
        const metadata = await matchMovie(
          movie.title,
          movie.year,
        );

        if (!metadata) {
          errors.push(
            `Movie: ${movie.title} - no match`,
          );
          continue;
        }

        await prisma.movie.update({
          where: { id: movie.id },
          data: {
            tmdbId: metadata.tmdbId,
            overview: metadata.overview,
            poster: metadata.poster,
            backdrop: metadata.backdrop,
            voteAverage: metadata.voteAverage,
          },
        });

        moviesMatched++;
      } catch (error) {
        errors.push(
          `Movie: ${movie.title} - ${
            error instanceof Error
              ? error.message
              : "Unknown error"
          }`,
        );
      }
    }

    for (const seriesItem of series) {
      try {
        const metadata = await matchSeries(
          seriesItem.title,
          seriesItem.year,
        );

        if (!metadata) {
          errors.push(
            `Series: ${seriesItem.title} - no match`,
          );
          continue;
        }

        await prisma.series.update({
          where: {
            id: seriesItem.id,
          },
          data: {
            tmdbId: metadata.tmdbId,
            overview: metadata.overview,
            poster: metadata.poster,
            backdrop: metadata.backdrop,
            voteAverage:
              metadata.voteAverage,
          },
        });

        seriesMatched++;
      } catch (error) {
        errors.push(
          `Series: ${seriesItem.title} - ${
            error instanceof Error
              ? error.message
              : "Unknown error"
          }`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      movies: {
        total: movies.length,
        matched: moviesMatched,
      },
      series: {
        total: series.length,
        matched: seriesMatched,
      },
      errors,
    });
  } catch (error) {
    console.error(
      "POST /api/metadata/match-all:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to match library metadata",
      },
      { status: 500 },
    );
  }
}