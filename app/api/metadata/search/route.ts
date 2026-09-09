import { NextRequest, NextResponse } from "next/server";

import {
  searchMovies,
  searchTv,
  tmdbBackdropUrl,
  tmdbPosterUrl,
} from "@/lib/metadata/tmdb";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const type =
      searchParams.get("type");

    const title =
      searchParams.get("title")?.trim();

    const yearParam =
      searchParams.get("year");

    if (
      type !== "movie" &&
      type !== "series"
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

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: "title is required",
        },
        { status: 400 },
      );
    }

    const year =
      yearParam &&
      /^\d{4}$/.test(yearParam)
        ? Number(yearParam)
        : undefined;

    if (type === "movie") {
      const results =
        await searchMovies(
          title,
          year,
        );

      return NextResponse.json({
        success: true,
        results: results.map(
          (movie) => ({
            tmdbId: movie.id,
            title: movie.title,
            originalTitle:
              movie.original_title,
            year:
              movie.release_date
                ? Number(
                    movie.release_date.slice(
                      0,
                      4,
                    ),
                  )
                : null,
            overview:
              movie.overview || null,
            poster:
              tmdbPosterUrl(
                movie.poster_path,
                "w500",
              ),
            backdrop:
              tmdbBackdropUrl(
                movie.backdrop_path,
                "w780",
              ),
            voteAverage:
              movie.vote_average,
          }),
        ),
      });
    }

    const results =
      await searchTv(
        title,
        year,
      );

    return NextResponse.json({
      success: true,
      results: results.map(
        (series) => ({
          tmdbId: series.id,
          title: series.name,
          originalTitle:
            series.original_name,
          year:
            series.first_air_date
              ? Number(
                  series.first_air_date.slice(
                    0,
                    4,
                  ),
                )
              : null,
          overview:
            series.overview || null,
          poster:
            tmdbPosterUrl(
              series.poster_path,
              "w500",
            ),
          backdrop:
            tmdbBackdropUrl(
              series.backdrop_path,
              "w780",
            ),
          voteAverage:
            series.vote_average,
        }),
      ),
    });
  } catch (error) {
    console.error(
      "TMDB search failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "TMDB search failed",
      },
      { status: 500 },
    );
  }
}