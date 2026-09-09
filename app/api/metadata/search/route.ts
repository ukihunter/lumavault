
import { NextRequest, NextResponse } from "next/server";

import {
  searchMovies,
  searchTv,
  tmdbBackdrop,
  tmdbPoster,
} from "@/lib/metadata/tmdb";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type");
    const title = searchParams.get("title")?.trim();
    const yearParam = searchParams.get("year");

    if (type !== "movie" && type !== "series") {
      return NextResponse.json(
        {
          success: false,
          error: "type must be movie or series",
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
      yearParam && /^\d{4}$/.test(yearParam)
        ? Number(yearParam)
        : undefined;

    // Movies
    if (type === "movie") {
      const results = await searchMovies(title, year);

      return NextResponse.json({
        success: true,
        results: results.map((movie) => ({
          tmdbId: movie.id,
          title: movie.title,

          // Your current TmdbMovie type does not expose
          // original_title, so use the available title.
          originalTitle: movie.title,

          year: movie.release_date
            ? Number(movie.release_date.slice(0, 4))
            : null,

          overview: movie.overview || null,

          poster: tmdbPoster(movie.poster_path),

          backdrop: tmdbBackdrop(movie.backdrop_path),

          voteAverage: movie.vote_average ?? null,
        })),
      });
    }

    // TV Series
    const results = await searchTv(title, year);

    return NextResponse.json({
      success: true,
      results: results.map((series) => ({
        tmdbId: series.id,
        title: series.name,

        // Your current TmdbTv type does not expose
        // original_name, so use the available name.
        originalTitle: series.name,

        year: series.first_air_date
          ? Number(series.first_air_date.slice(0, 4))
          : null,

        overview: series.overview || null,

        poster: tmdbPoster(series.poster_path),

        backdrop: tmdbBackdrop(series.backdrop_path),

        voteAverage: series.vote_average ?? null,
      })),
    });
  } catch (error) {
    console.error("TMDB search failed:", error);

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
