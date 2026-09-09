const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const TMDB_TOKEN = process.env.TMDB_API_READ_ACCESS_TOKEN;

if (!TMDB_TOKEN) {
  throw new Error(
    "TMDB_API_READ_ACCESS_TOKEN is not configured.",
  );
}

type TmdbMovieSearchResult = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
};

type TmdbTvSearchResult = {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  first_air_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
};

type TmdbSearchResponse<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

type TmdbMovieDetails = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
};

type TmdbTvDetails = {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  first_air_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
};

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${TMDB_TOKEN}`,
    Accept: "application/json",
  };
}

async function tmdbFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(`${TMDB_API_BASE}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");

    throw new Error(
      `TMDB request failed (${response.status}): ${body || response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

export function tmdbPosterUrl(
  path: string | null | undefined,
  size: "w185" | "w342" | "w500" | "w780" | "original" = "w500",
) {
  if (!path) {
    return null;
  }

  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function tmdbBackdropUrl(
  path: string | null | undefined,
  size: "w780" | "w1280" | "original" = "original",
) {
  if (!path) {
    return null;
  }

  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export async function searchMovies(
  title: string,
  year?: number | null,
) {
  const data = await tmdbFetch<
    TmdbSearchResponse<TmdbMovieSearchResult>
  >("/search/movie", {
    query: title,
    year: year ?? undefined,
    include_adult: "false",
    language: "en-US",
    page: 1,
  });

  return data.results;
}

export async function searchTv(
  title: string,
  year?: number | null,
) {
  const data = await tmdbFetch<
    TmdbSearchResponse<TmdbTvSearchResult>
  >("/search/tv", {
    query: title,
    first_air_date_year: year ?? undefined,
    include_adult: "false",
    language: "en-US",
    page: 1,
  });

  return data.results;
}

export async function getMovieDetails(
  tmdbId: number,
) {
  return tmdbFetch<TmdbMovieDetails>(
    `/movie/${tmdbId}`,
    {
      language: "en-US",
    },
  );
}

export async function getTvDetails(
  tmdbId: number,
) {
  return tmdbFetch<TmdbTvDetails>(
    `/tv/${tmdbId}`,
    {
      language: "en-US",
    },
  );
}