import "server-only";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

const TMDB_TOKEN = process.env.TMDB_API_READ_ACCESS_TOKEN;

if (!TMDB_TOKEN) {
  console.warn(
    "TMDB_API_READ_ACCESS_TOKEN is not configured.",
  );
}

export type TmdbMovie = {
  id: number;
  title: string;
  original_title?: string;
  overview?: string | null;
  release_date?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number | null;
};

export type TmdbTv = {
  id: number;
  name: string;
  original_name?: string;
  overview?: string | null;
  first_air_date?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number | null;
};

export type TmdbEpisode = {
  id: number;
  name: string;
  overview?: string | null;
  air_date?: string | null;
  episode_number: number;
  season_number: number;
  still_path?: string | null;
  vote_average?: number | null;
  runtime?: number | null;
};

type TmdbSearchMovieResponse = {
  page: number;
  results: TmdbMovie[];
  total_pages: number;
  total_results: number;
};

type TmdbSearchTvResponse = {
  page: number;
  results: TmdbTv[];
  total_pages: number;
  total_results: number;
};

async function tmdbFetch<T>(
  path: string,
  params?: Record<
    string,
    string | number | undefined
  >,
): Promise<T> {
  if (!TMDB_TOKEN) {
    throw new Error(
      "TMDB_API_READ_ACCESS_TOKEN is not configured.",
    );
  }

  const url = new URL(
    `${TMDB_BASE_URL}${path}`,
  );

  if (params) {
    for (const [key, value] of Object.entries(
      params,
    )) {
      if (value !== undefined) {
        url.searchParams.set(
          key,
          String(value),
        );
      }
    }
  }

  const response = await fetch(
    url.toString(),
    {
      headers: {
        Authorization: `Bearer ${TMDB_TOKEN}`,
        accept: "application/json",
      },

      // Metadata does not need to be fetched
      // repeatedly for every page request.
      next: {
        revalidate: 86400,
      },
    },
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `TMDB request failed (${response.status}): ${text}`,
    );
  }

  return response.json() as Promise<T>;
}

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

export async function searchMovies(
  query: string,
  year?: number | null,
): Promise<TmdbMovie[]> {
  const response =
    await tmdbFetch<TmdbSearchMovieResponse>(
      "/search/movie",
      {
        query,
        year:
          year && year > 0
            ? year
            : undefined,
        language: "en-US",
        page: 1,
        include_adult: "false",
      },
    );

  return response.results;
}

export async function searchTv(
  query: string,
  year?: number | null,
): Promise<TmdbTv[]> {
  const response =
    await tmdbFetch<TmdbSearchTvResponse>(
      "/search/tv",
      {
        query,
        first_air_date_year:
          year && year > 0
            ? year
            : undefined,
        language: "en-US",
        page: 1,
        include_adult: "false",
      },
    );

  return response.results;
}

/* -------------------------------------------------------------------------- */
/* Details                                                                    */
/* -------------------------------------------------------------------------- */

export async function getMovieDetails(
  tmdbId: number,
): Promise<TmdbMovie> {
  return tmdbFetch<TmdbMovie>(
    `/movie/${tmdbId}`,
    {
      language: "en-US",
    },
  );
}

export async function getTvDetails(
  tmdbId: number,
): Promise<TmdbTv> {
  return tmdbFetch<TmdbTv>(
    `/tv/${tmdbId}`,
    {
      language: "en-US",
    },
  );
}

export async function getTvEpisodeDetails(
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<TmdbEpisode> {
  return tmdbFetch<TmdbEpisode>(
    `/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`,
    {
      language: "en-US",
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Images                                                                     */
/* -------------------------------------------------------------------------- */

export function tmdbPoster(
  path: string | null | undefined,
  size = "w500",
): string | null {
  if (!path) {
    return null;
  }

  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export function tmdbBackdrop(
  path: string | null | undefined,
  size = "w1280",
): string | null {
  if (!path) {
    return null;
  }

  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export function tmdbEpisodeStill(
  path: string | null | undefined,
  size = "w780",
): string | null {
  if (!path) {
    return null;
  }

  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}