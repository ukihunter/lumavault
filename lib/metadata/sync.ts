
import { prisma } from "@/lib/db/prisma";

import {
  getMovieDetails,
  getTvDetails,
  getTvEpisodeDetails,
  searchMovies,
  searchTv,
  tmdbBackdrop,
  tmdbEpisodeStill,
  tmdbPoster,
} from "@/lib/metadata/tmdb";

type SyncOptions = {
  force?: boolean;
  syncEpisodes?: boolean;
};

export type MetadataSyncResult = {
  movies: {
    total: number;
    matched: number;
    skipped: number;
    failed: number;
  };

  series: {
    total: number;
    matched: number;
    skipped: number;
    failed: number;
  };

  episodes: {
    total: number;
    matched: number;
    skipped: number;
    failed: number;
  };

  errors: string[];
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()

    // Replace filename separators with spaces.
    .replace(/[_\\]+/g, " ")

    // Remove years in parentheses or brackets.
    .replace(/\(\s*(19|20)\d{2}\s*\)/g, " ")
    .replace(/\[\s*(19|20)\d{2}\s*\]/g, " ")

    // Remove standalone years.
    .replace(/\b(19|20)\d{2}\b/g, " ")

    // Normalize separators and punctuation.
    .replace(/[-.:_,]+/g, " ")

    // Keep only letters, numbers and spaces.
    .replace(/[^a-z0-9\s]/g, " ")

    // Collapse whitespace.
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Converts a local filename/title into a cleaner TMDB search query.
 *
 * Examples:
 *
 * Ben 10_ Alien Force (2008)
 * -> Ben 10 Alien Force
 *
 * Ben 10_ Omniverse (2012)
 * -> Ben 10 Omniverse
 *
 * Ben 10 - Generator Rex Heroes United (2011)
 * -> Ben 10 Generator Rex Heroes United
 */
function cleanSearchTitle(title: string): string {
  return title
    // Filename separators.
    .replace(/[_\\]+/g, " ")

    // Remove years in parentheses/brackets.
    .replace(/\(\s*(19|20)\d{2}\s*\)/g, " ")
    .replace(/\[\s*(19|20)\d{2}\s*\]/g, " ")

    // Remove standalone year.
    .replace(/\b(19|20)\d{2}\b/g, " ")

    // Normalize separators.
    .replace(/[-.:_,]+/g, " ")

    // Collapse spaces.
    .replace(/\s+/g, " ")

    .trim();
}

function getYearFromDate(
  date: string | null | undefined,
): number | null {
  if (!date) {
    return null;
  }

  const year = Number(date.slice(0, 4));

  return Number.isInteger(year) ? year : null;
}

function titleScore(
  localTitle: string,
  tmdbTitle: string,
): number {
  const local = normalizeTitle(localTitle);
  const remote = normalizeTitle(tmdbTitle);

  if (!local || !remote) {
    return 0;
  }

  if (local === remote) {
    return 1;
  }

  if (
    local.includes(remote) ||
    remote.includes(local)
  ) {
    return 0.9;
  }

  const localWords = new Set(local.split(" "));
  const remoteWords = new Set(remote.split(" "));

  const intersection = [...localWords].filter(
    (word) => remoteWords.has(word),
  );

  const union = new Set([
    ...localWords,
    ...remoteWords,
  ]);

  return (
    intersection.length /
    Math.max(union.size, 1)
  );
}

function matchScore(
  localTitle: string,
  localYear: number | null,
  remoteTitle: string,
  remoteYear: number | null,
): number {
  let score = titleScore(
    localTitle,
    remoteTitle,
  );

  if (
    localYear &&
    remoteYear &&
    localYear === remoteYear
  ) {
    score += 0.2;
  } else if (
    localYear &&
    remoteYear &&
    Math.abs(localYear - remoteYear) === 1
  ) {
    score += 0.05;
  }

  return Math.min(score, 1);
}

function addError(
  result: MetadataSyncResult,
  message: string,
) {
  result.errors.push(message);
}

/**
 * Search movies using several increasingly permissive queries.
 */
async function findMovieCandidates(
  title: string,
  year: number | null,
) {
  const searchTitle = cleanSearchTitle(title);

  const queries = [
    {
      title: searchTitle,
      year,
    },
    {
      title: searchTitle,
      year: null,
    },
    {
      title: normalizeTitle(searchTitle),
      year: null,
    },
  ];

  const seen = new Map<number, (typeof queries)[number]>();

  for (const query of queries) {
    if (!query.title) {
      continue;
    }

    try {
      const results = await searchMovies(
        query.title,
        query.year,
      );

      for (const movie of results) {
        if (!seen.has(movie.id)) {
          seen.set(movie.id, query);
        }
      }

      if (seen.size > 0) {
        break;
      }
    } catch {
      // Try the next fallback query.
    }
  }

  // We don't need the query metadata here.
  // Return only unique TMDB candidates.
  if (seen.size === 0) {
    return [];
  }

  const firstQueryResults = await Promise.all(
    [],
  );

  void firstQueryResults;

  // Re-run using the most useful query so that
  // the returned objects are the actual TMDB results.
  for (const query of queries) {
    if (!query.title) {
      continue;
    }

    try {
      const results = await searchMovies(
        query.title,
        query.year,
      );

      if (results.length) {
        return results;
      }
    } catch {
      // Continue fallback.
    }
  }

  return [];
}

/**
 * Search TV shows using several increasingly permissive queries.
 */
async function findTvCandidates(
  title: string,
  year: number | null,
) {
  const searchTitle = cleanSearchTitle(title);

  const queries = [
    {
      title: searchTitle,
      year,
    },
    {
      title: searchTitle,
      year: null,
    },
    {
      title: normalizeTitle(searchTitle),
      year: null,
    },
  ];

  for (const query of queries) {
    if (!query.title) {
      continue;
    }

    try {
      const results = await searchTv(
        query.title,
        query.year,
      );

      if (results.length) {
        return results;
      }
    } catch {
      // Try the next fallback query.
    }
  }

  return [];
}

/* -------------------------------------------------------------------------- */
/* Movie                                                                      */
/* -------------------------------------------------------------------------- */

async function syncMovie(
  movie: {
    id: string;
    title: string;
    year: number | null;
    tmdbId: number | null;
    poster: string | null;
    backdrop: string | null;
  },
  force: boolean,
  result: MetadataSyncResult,
) {
  if (
    !force &&
    movie.tmdbId &&
    movie.poster &&
    movie.backdrop
  ) {
    result.movies.skipped++;
    return;
  }

  try {
    let tmdbId = movie.tmdbId;

    /* Existing TMDB ID */
    if (tmdbId) {
      const details = await getMovieDetails(tmdbId);

      await prisma.movie.update({
        where: {
          id: movie.id,
        },

        data: {
          tmdbId: details.id,

          title:
            details.title || movie.title,

          year:
            getYearFromDate(
              details.release_date,
            ) ?? movie.year,

          overview:
            details.overview || null,

          poster: tmdbPoster(
            details.poster_path,
          ),

          backdrop: tmdbBackdrop(
            details.backdrop_path,
          ),

          voteAverage:
            details.vote_average ?? null,
        },
      });

      result.movies.matched++;
      return;
    }

    /* Search TMDB */
    const candidates =
      await findMovieCandidates(
        movie.title,
        movie.year,
      );

    if (!candidates.length) {
      result.movies.failed++;

      addError(
        result,
        `Movie "${movie.title}": no TMDB match`,
      );

      return;
    }

    const scored = candidates
      .map((candidate) => ({
        candidate,

        score: matchScore(
          movie.title,
          movie.year,

          candidate.title,

          getYearFromDate(
            candidate.release_date,
          ),
        ),
      }))

      .sort(
        (a, b) =>
          b.score - a.score,
      );

    const best = scored[0];

    if (
      !best ||
      best.score < 0.55
    ) {
      result.movies.failed++;

      addError(
        result,
        `Movie "${movie.title}": weak TMDB match`,
      );

      return;
    }

    /* Get full details */
    const details =
      await getMovieDetails(
        best.candidate.id,
      );

    await prisma.movie.update({
      where: {
        id: movie.id,
      },

      data: {
        tmdbId: details.id,

        title:
          details.title || movie.title,

        year:
          getYearFromDate(
            details.release_date,
          ) ?? movie.year,

        overview:
          details.overview || null,

        poster:
          tmdbPoster(
            details.poster_path,
          ),

        backdrop:
          tmdbBackdrop(
            details.backdrop_path,
          ),

        voteAverage:
          details.vote_average ?? null,
      },
    });

    result.movies.matched++;
  } catch (error) {
    result.movies.failed++;

    addError(
      result,
      `Movie "${movie.title}": ${
        error instanceof Error
          ? error.message
          : "Unknown error"
      }`,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Series                                                                     */
/* -------------------------------------------------------------------------- */

async function syncSeries(
  series: {
    id: string;
    title: string;
    year: number | null;
    tmdbId: number | null;
    poster: string | null;
    backdrop: string | null;
  },
  force: boolean,
  result: MetadataSyncResult,
) {
  if (
    !force &&
    series.tmdbId &&
    series.poster &&
    series.backdrop
  ) {
    result.series.skipped++;
    return;
  }

  try {
    /* Existing TMDB ID */
    if (series.tmdbId) {
      const details =
        await getTvDetails(
          series.tmdbId,
        );

      await prisma.series.update({
        where: {
          id: series.id,
        },

        data: {
          tmdbId: details.id,

          title:
            details.name ||
            series.title,

          year:
            getYearFromDate(
              details.first_air_date,
            ) ?? series.year,

          overview:
            details.overview || null,

          poster:
            tmdbPoster(
              details.poster_path,
            ),

          backdrop:
            tmdbBackdrop(
              details.backdrop_path,
            ),

          voteAverage:
            details.vote_average ?? null,
        },
      });

      result.series.matched++;
      return;
    }

    /* Search TMDB */
    const candidates =
      await findTvCandidates(
        series.title,
        series.year,
      );

    if (!candidates.length) {
      result.series.failed++;

      addError(
        result,
        `Series "${series.title}": no TMDB match`,
      );

      return;
    }

    const scored = candidates
      .map((candidate) => ({
        candidate,

        score: matchScore(
          series.title,
          series.year,

          candidate.name,

          getYearFromDate(
            candidate.first_air_date,
          ),
        ),
      }))

      .sort(
        (a, b) =>
          b.score - a.score,
      );

    const best = scored[0];

    if (
      !best ||
      best.score < 0.55
    ) {
      result.series.failed++;

      addError(
        result,
        `Series "${series.title}": weak TMDB match`,
      );

      return;
    }

    /* Get full series details */
    const details =
      await getTvDetails(
        best.candidate.id,
      );

    await prisma.series.update({
      where: {
        id: series.id,
      },

      data: {
        tmdbId: details.id,

        title:
          details.name ||
          series.title,

        year:
          getYearFromDate(
            details.first_air_date,
          ) ?? series.year,

        overview:
          details.overview || null,

        poster:
          tmdbPoster(
            details.poster_path,
          ),

        backdrop:
          tmdbBackdrop(
            details.backdrop_path,
          ),

        voteAverage:
          details.vote_average ?? null,
      },
    });

    result.series.matched++;
  } catch (error) {
    result.series.failed++;

    addError(
      result,
      `Series "${series.title}": ${
        error instanceof Error
          ? error.message
          : "Unknown error"
      }`,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Episode                                                                    */
/* -------------------------------------------------------------------------- */

async function syncEpisode(
  episode: {
    id: string;
    number: number;
    title: string;
    thumbnail: string | null;

    season: {
      number: number;

      series: {
        id: string;
        title: string;
        tmdbId: number | null;
      };
    };
  },
  force: boolean,
  result: MetadataSyncResult,
) {
  if (
    !force &&
    episode.thumbnail
  ) {
    result.episodes.skipped++;
    return;
  }

  const seriesTmdbId =
    episode.season.series.tmdbId;

  if (!seriesTmdbId) {
    result.episodes.failed++;

    addError(
      result,
      `Episode "${episode.season.series.title} S${String(
        episode.season.number,
      ).padStart(
        2,
        "0",
      )}E${String(
        episode.number,
      ).padStart(
        2,
        "0",
      )}": series has no TMDB ID`,
    );

    return;
  }

  try {
    /*
     * TMDB episode lookup:
     *
     * /tv/{seriesId}/season/{season}/episode/{episode}
     *
     * We use the already matched series TMDB ID,
     * so there is no need to search "Episode 6".
     */
    const details =
      await getTvEpisodeDetails(
        seriesTmdbId,

        episode.season.number,

        episode.number,
      );

    const thumbnail =
      tmdbEpisodeStill(
        details.still_path,
      );

    /*
     * Some episodes simply don't have
     * an image on TMDB.
     */
    if (!thumbnail) {
      result.episodes.failed++;

      addError(
        result,
        `Episode "${episode.season.series.title} S${String(
          episode.season.number,
        ).padStart(
          2,
          "0",
        )}E${String(
          episode.number,
        ).padStart(
          2,
          "0",
        )}": TMDB has no still image`,
      );

      /*
       * Still update metadata if available.
       */
      await prisma.episode.update({
        where: {
          id: episode.id,
        },

        data: {
          title:
            details.name ||
            episode.title,

          description:
            details.overview || null,

          duration:
            details.runtime ?? null,
        },
      });

      return;
    }

    await prisma.episode.update({
      where: {
        id: episode.id,
      },

      data: {
        thumbnail,

        title:
          details.name ||
          episode.title,

        description:
          details.overview || null,

        duration:
          details.runtime ?? null,
      },
    });

    result.episodes.matched++;
  } catch (error) {
    result.episodes.failed++;

    addError(
      result,
      `Episode "${episode.season.series.title} S${String(
        episode.season.number,
      ).padStart(
        2,
        "0",
      )}E${String(
        episode.number,
      ).padStart(
        2,
        "0",
      )}": ${
        error instanceof Error
          ? error.message
          : "Unknown error"
      }`,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Full synchronization                                                       */
/* -------------------------------------------------------------------------- */

export async function syncMetadata(
  options: SyncOptions = {},
): Promise<MetadataSyncResult> {
  const {
    force = false,
    syncEpisodes = true,
  } = options;

  const result: MetadataSyncResult = {
    movies: {
      total: 0,
      matched: 0,
      skipped: 0,
      failed: 0,
    },

    series: {
      total: 0,
      matched: 0,
      skipped: 0,
      failed: 0,
    },

    episodes: {
      total: 0,
      matched: 0,
      skipped: 0,
      failed: 0,
    },

    errors: [],
  };

  /* ------------------------------------------------------------------------ */
  /* Movies                                                                   */
  /* ------------------------------------------------------------------------ */

  const movies =
    await prisma.movie.findMany({
      select: {
        id: true,
        title: true,
        year: true,
        tmdbId: true,
        poster: true,
        backdrop: true,
      },

      orderBy: {
        title: "asc",
      },
    });

  result.movies.total =
    movies.length;

  for (const movie of movies) {
    await syncMovie(
      movie,
      force,
      result,
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Series                                                                   */
  /* ------------------------------------------------------------------------ */

  const series =
    await prisma.series.findMany({
      select: {
        id: true,
        title: true,
        year: true,
        tmdbId: true,
        poster: true,
        backdrop: true,
      },

      orderBy: {
        title: "asc",
      },
    });

  result.series.total =
    series.length;

  for (const item of series) {
    await syncSeries(
      item,
      force,
      result,
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Episodes                                                                 */
  /* ------------------------------------------------------------------------ */

  /*
   * Important:
   *
   * We load episodes AFTER series synchronization.
   * That means their related Series records now contain
   * the newly assigned TMDB IDs.
   */
  if (syncEpisodes) {
    const episodes =
      await prisma.episode.findMany({
        select: {
          id: true,
          number: true,
          title: true,
          thumbnail: true,

          season: {
            select: {
              number: true,

              series: {
                select: {
                  id: true,
                  title: true,
                  tmdbId: true,
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: "asc",
        },
      });

    result.episodes.total =
      episodes.length;

    for (const episode of episodes) {
      await syncEpisode(
        episode,
        force,
        result,
      );
    }
  }

  return result;
}

