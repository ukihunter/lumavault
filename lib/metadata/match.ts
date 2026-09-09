// lib/metadata/match.ts

import {
  searchMovies,
  searchTv,
  tmdbBackdrop,
  tmdbPoster,
} from "@/lib/metadata/tmdb";

import { calculateMatchScore } from "@/lib/metadata/matcher";

export async function matchMovie(
  title: string,
  year?: number | null,
) {
  const results = await searchMovies(
    title,
    year,
  );

  if (!results.length) {
    return null;
  }

  const scored = results.map((movie) => {
    const movieYear = movie.release_date
      ? Number(movie.release_date.slice(0, 4))
      : null;

    return {
      movie,
      score: calculateMatchScore(
        title,
        year,
        movie.title,
        movieYear,
      ),
    };
  });

  scored.sort(
    (a, b) => b.score - a.score,
  );

  const best = scored[0];

  if (!best || best.score < 0.55) {
    return null;
  }

  return {
    tmdbId: best.movie.id,
    title: best.movie.title,
    year: best.movie.release_date
      ? Number(best.movie.release_date.slice(0, 4))
      : null,
    overview: best.movie.overview ?? null,
    poster: tmdbPoster(
      best.movie.poster_path,
    ),
    backdrop: tmdbBackdrop(
      best.movie.backdrop_path,
    ),
    voteAverage:
      best.movie.vote_average ?? null,
    score: best.score,
  };
}

export async function matchSeries(
  title: string,
  year?: number | null,
) {
  const results = await searchTv(
    title,
    year,
  );

  if (!results.length) {
    return null;
  }

  const scored = results.map((series) => {
    const seriesYear = series.first_air_date
      ? Number(
          series.first_air_date.slice(0, 4),
        )
      : null;

    return {
      series,
      score: calculateMatchScore(
        title,
        year,
        series.name,
        seriesYear,
      ),
    };
  });

  scored.sort(
    (a, b) => b.score - a.score,
  );

  const best = scored[0];

  if (!best || best.score < 0.55) {
    return null;
  }

  return {
    tmdbId: best.series.id,
    title: best.series.name,
    year: best.series.first_air_date
      ? Number(
          best.series.first_air_date.slice(0, 4),
        )
      : null,
    overview: best.series.overview ?? null,
    poster: tmdbPoster(
      best.series.poster_path,
    ),
    backdrop: tmdbBackdrop(
      best.series.backdrop_path,
    ),
    voteAverage:
      best.series.vote_average ?? null,
    score: best.score,
  };
}