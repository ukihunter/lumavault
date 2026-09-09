import {
  searchMovies,
  searchTv,
  getMovieDetails,
  getTvDetails,
  tmdbBackdropUrl,
  tmdbPosterUrl,
} from "./tmdb";

import { calculateMatchScore } from "./matcher";

export type MetadataMatch = {
  tmdbId: number;
  title: string;
  year: number | null;
  overview: string | null;
  poster: string | null;
  backdrop: string | null;
  voteAverage: number;
  score: number;
};

function extractYear(
  date: string | null | undefined,
) {
  if (!date) {
    return null;
  }

  const match = date.match(/^(\d{4})/);

  return match
    ? Number(match[1])
    : null;
}

export async function matchMovie(
  title: string,
  year?: number | null,
): Promise<MetadataMatch | null> {
  const results = await searchMovies(
    title,
    year,
  );

  if (!results.length) {
    return null;
  }

  const candidates = results.map(
    (movie) => {
      const candidateYear =
        extractYear(movie.release_date);

      return {
        tmdbId: movie.id,
        title: movie.title,
        year: candidateYear,
        overview: movie.overview || null,
        poster: tmdbPosterUrl(
          movie.poster_path,
          "w500",
        ),
        backdrop: tmdbBackdropUrl(
          movie.backdrop_path,
          "original",
        ),
        voteAverage: movie.vote_average,
        score: calculateMatchScore({
          localTitle: title,
          localYear: year,
          candidateTitle: movie.title,
          candidateYear,
        }),
      };
    },
  );

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      b.voteAverage - a.voteAverage,
  );

  const best = candidates[0];

  if (!best) {
    return null;
  }

  return best;
}

export async function matchSeries(
  title: string,
  year?: number | null,
): Promise<MetadataMatch | null> {
  const results = await searchTv(
    title,
    year,
  );

  if (!results.length) {
    return null;
  }

  const candidates = results.map(
    (series) => {
      const candidateYear =
        extractYear(
          series.first_air_date,
        );

      return {
        tmdbId: series.id,
        title: series.name,
        year: candidateYear,
        overview: series.overview || null,
        poster: tmdbPosterUrl(
          series.poster_path,
          "w500",
        ),
        backdrop: tmdbBackdropUrl(
          series.backdrop_path,
          "original",
        ),
        voteAverage: series.vote_average,
        score: calculateMatchScore({
          localTitle: title,
          localYear: year,
          candidateTitle: series.name,
          candidateYear,
        }),
      };
    },
  );

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      b.voteAverage - a.voteAverage,
  );

  const best = candidates[0];

  if (!best) {
    return null;
  }

  return best;
}