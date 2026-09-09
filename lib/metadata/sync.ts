
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

    // Remove years in parentheses.
    .replace(/\(\s*(19|20)\d{2}\s*\)/g, " ")

    // Remove years in brackets.
    .replace(/\[\s*(19|20)\d{2}\s*\]/g, " ")

    // Remove standalone years.
    .replace(/\b(19|20)\d{2}\b/g, " ")

    // Normalize separators and punctuation.
    .replace(/[-.:\_,]+/g, " ")

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
 * Ben 10 (2005)
 * -> Ben 10
 */
function cleanSearchTitle(title: string): string {
  return title
    .replace(/[_\\]+/g, " ")

    // Remove years in parentheses.
    .replace(/\(\s*(19|20)\d{2}\s*\)/g, " ")

    // Remove years in brackets.
    .replace(/\[\s*(19|20)\d{2}\s*\]/g, " ")

    // Remove standalone years.
    .replace(/\b(19|20)\d{2}\b/g, " ")

    // Normalize separators.
    .replace(/[-.:\_,]+/g, " ")

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

  const intersection = [
    ...localWords,
  ].filter((word) =>
    remoteWords.has(word),
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

/**
 * General title/year score.
 *
 * The series matcher below uses stricter year rules than this helper,
 * but movie matching can continue using the normal weighted score.
 */
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
    Math.abs(
      localYear - remoteYear,
    ) === 1
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

/* -------------------------------------------------------------------------- */
/* Movie candidates                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Search movies using the year first, then fallback queries.
 */
async function findMovieCandidates(
  title: string,
  year: number | null,
) {
  const searchTitle = cleanSearchTitle(title);

  if (!searchTitle) {
    return [];
  }

  /**
   * First try the most precise search.
   */
  if (year && year > 0) {
    try {
      const results = await searchMovies(
        searchTitle,
        year,
      );

      if (results.length > 0) {
        return results;
      }
    } catch {
      // Continue to fallback.
    }
  }

  /**
   * Fallback without year.
   */
  const fallbackTitles = [
    searchTitle,
    normalizeTitle(searchTitle),
  ];

  for (const query of fallbackTitles) {
    if (!query) {
      continue;
    }

    try {
      const results = await searchMovies(
        query,
      );

      if (results.length > 0) {
        return results;
      }
    } catch {
      // Continue fallback.
    }
  }

  return [];
}

/* -------------------------------------------------------------------------- */
/* TV candidates                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Search TV shows using the year whenever one is known.
 *
 * This is particularly important for:
 *
 * Ben 10 (2005)
 * Ben 10 (2016)
 *
 * because TMDB uses the exact same display title for both.
 */
async function findTvCandidates(
  title: string,
  year: number | null,
) {
  const searchTitle = cleanSearchTitle(title);

  if (!searchTitle) {
    return [];
  }

  /**
   * FIRST:
   *
   * Search using the known local year.
   *
   * This should give us the most precise candidate set.
   */
  if (year && year > 0) {
    try {
      const yearResults = await searchTv(
        searchTitle,
        year,
      );

      if (yearResults.length > 0) {
        return yearResults;
      }
    } catch {
      // Continue to fallback search.
    }
  }

  /**
   * FALLBACK:
   *
   * Search without year only when the
   * year-specific search returned nothing.
   *
   * syncSeries() still performs strict
   * year validation before accepting
   * the result.
   */
  const fallbackTitles = [
    searchTitle,
    normalizeTitle(searchTitle),
  ];

  for (const query of fallbackTitles) {
    if (!query) {
      continue;
    }

    try {
      const results = await searchTv(query);

      if (results.length > 0) {
        return results;
      }
    } catch {
      // Continue fallback.
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
  /**
   * Nothing to do when metadata already exists
   * and force mode is disabled.
   */
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
    /**
     * Existing TMDB ID.
     *
     * With force=false, keep using the existing
     * matched TMDB ID.
     *
     * With force=true, deliberately ignore it and
     * perform a fresh search.
     */
    if (movie.tmdbId && !force) {
      const details = await getMovieDetails(
        movie.tmdbId,
      );

      await prisma.movie.update({
        where: {
          id: movie.id,
        },

        data: {
          tmdbId: details.id,

          title:
            details.title ||
            movie.title,

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
            details.vote_average ??
            null,
        },
      });

      result.movies.matched++;
      return;
    }

    /**
     * Fresh TMDB search.
     */
    const candidates =
      await findMovieCandidates(
        movie.title,
        movie.year,
      );

    if (!candidates.length) {
      result.movies.failed++;

      addError(
        result,
        `Movie "${movie.title}"${
          movie.year
            ? ` (${movie.year})`
            : ""
        }: no TMDB match`,
      );

      return;
    }

    const scored = candidates
      .map((candidate) => ({
        candidate,

        remoteYear:
          getYearFromDate(
            candidate.release_date,
          ),

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

    if (!best) {
      result.movies.failed++;

      addError(
        result,
        `Movie "${movie.title}": no suitable TMDB match`,
      );

      return;
    }

    /**
     * Reject an obviously wrong year when
     * the local movie year is known.
     */
    if (
      movie.year &&
      best.remoteYear &&
      Math.abs(
        movie.year -
          best.remoteYear,
      ) > 1
    ) {
      result.movies.failed++;

      addError(
        result,
        `Movie "${movie.title}" (${movie.year}): best TMDB candidate "${best.candidate.title}" (${best.remoteYear}) has the wrong year`,
      );

      return;
    }

    if (best.score < 0.55) {
      result.movies.failed++;

      addError(
        result,
        `Movie "${movie.title}"${
          movie.year
            ? ` (${movie.year})`
            : ""
        }: weak TMDB match`,
      );

      return;
    }

    /**
     * Get full TMDB details.
     */
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
          details.title ||
          movie.title,

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
          details.vote_average ??
          null,
      },
    });

    result.movies.matched++;

    console.log(
      `[Metadata] Movie "${movie.title}"${
        movie.year
          ? ` (${movie.year})`
          : ""
      } → "${details.title}" (${getYearFromDate(
        details.release_date,
      ) ?? "unknown"}) [TMDB ${details.id}]`,
    );
  } catch (error) {
    result.movies.failed++;

    addError(
      result,
      `Movie "${movie.title}"${
        movie.year
          ? ` (${movie.year})`
          : ""
      }: ${
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
  /**
   * Existing metadata is good enough when
   * force mode is disabled.
   */
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
    /**
     * IMPORTANT:
     *
     * Only reuse an existing TMDB ID when force=false.
     *
     * This is the key fix for the Ben 10 problem.
     *
     * Before:
     *
     *   force=true
     *      ↓
     *   existing wrong tmdbId
     *      ↓
     *   getTvDetails(oldId)
     *
     * Now:
     *
     *   force=true
     *      ↓
     *   fresh search using title + year
     */
    if (series.tmdbId && !force) {
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
            details.vote_average ??
            null,
        },
      });

      result.series.matched++;

      console.log(
        `[Metadata] Refreshed series "${series.title}" → "${details.name}" (${getYearFromDate(
          details.first_air_date,
        ) ?? "unknown"}) [TMDB ${details.id}]`,
      );

      return;
    }

    /**
     * Fresh TMDB search.
     */
    const candidates =
      await findTvCandidates(
        series.title,
        series.year,
      );

    if (!candidates.length) {
      result.series.failed++;

      addError(
        result,
        `Series "${series.title}"${
          series.year
            ? ` (${series.year})`
            : ""
        }: no TMDB match`,
      );

      return;
    }

    /**
     * Score candidates.
     *
     * Exact year is heavily favored.
     *
     * This is critical for shows that share
     * the exact same display title.
     */
    const scored = candidates
      .map((candidate) => {
        const remoteYear =
          getYearFromDate(
            candidate.first_air_date,
          );

        let score = titleScore(
          series.title,
          candidate.name,
        );

        /**
         * YEAR MATCHING
         *
         * Exact year:
         *      +0.50
         *
         * One year difference:
         *      +0.05
         *
         * Different year:
         *      -0.50
         *
         * This means:
         *
         * Ben 10 (2005)
         *      beats
         * Ben 10 (2016)
         *
         * even though their titles are identical.
         */
        if (
          series.year &&
          remoteYear
        ) {
          if (
            series.year ===
            remoteYear
          ) {
            score += 0.5;
          } else if (
            Math.abs(
              series.year -
                remoteYear,
            ) === 1
          ) {
            score += 0.05;
          } else {
            score -= 0.5;
          }
        }

        return {
          candidate,
          remoteYear,
          score,
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score,
      );

    /**
     * Diagnostic logging.
     *
     * This will make ambiguous matches easy
     * to see in the terminal.
     */
    console.log(
      `[Metadata] Series candidates for "${series.title}"${
        series.year
          ? ` (${series.year})`
          : ""
      }:`,
      scored.map((item) => ({
        id: item.candidate.id,
        name: item.candidate.name,
        year: item.remoteYear,
        score: Number(
          item.score.toFixed(3),
        ),
      })),
    );

    const best = scored[0];

    if (!best) {
      result.series.failed++;

      addError(
        result,
        `Series "${series.title}": no suitable TMDB match`,
      );

      return;
    }

    /**
     * HARD YEAR SAFETY CHECK
     *
     * If we know the local year and TMDB
     * provides a year, don't accept a result
     * from a completely different year.
     *
     * Example:
     *
     * Local: Ben 10 (2005)
     *
     * TMDB: Ben 10 (2016)
     *
     * → REJECT
     */
    if (
      series.year &&
      best.remoteYear &&
      Math.abs(
        series.year -
          best.remoteYear,
      ) > 1
    ) {
      result.series.failed++;

      addError(
        result,
        `Series "${series.title}" (${series.year}): best TMDB candidate "${best.candidate.name}" (${best.remoteYear}) has the wrong year`,
      );

      console.warn(
        `[Metadata] Rejected wrong-year series match`,
        {
          localTitle: series.title,
          localYear: series.year,

          tmdbId:
            best.candidate.id,

          tmdbTitle:
            best.candidate.name,

          tmdbYear:
            best.remoteYear,

          score:
            best.score,
        },
      );

      return;
    }

    if (best.score < 0.55) {
      result.series.failed++;

      addError(
        result,
        `Series "${series.title}"${
          series.year
            ? ` (${series.year})`
            : ""
        }: weak TMDB match`,
      );

      return;
    }

    /**
     * Get the complete selected TMDB series.
     */
    const details =
      await getTvDetails(
        best.candidate.id,
      );

    /**
     * Final defensive year check.
     *
     * The detail response may contain a more
     * authoritative first_air_date than the search result.
     */
    const detailsYear =
      getYearFromDate(
        details.first_air_date,
      );

    if (
      series.year &&
      detailsYear &&
      Math.abs(
        series.year -
          detailsYear,
      ) > 1
    ) {
      result.series.failed++;

      addError(
        result,
        `Series "${series.title}" (${series.year}): selected TMDB series "${details.name}" (${detailsYear}) has the wrong year`,
      );

      console.warn(
        `[Metadata] Rejected wrong-year detail response`,
        {
          localTitle: series.title,
          localYear: series.year,

          tmdbId:
            details.id,

          tmdbTitle:
            details.name,

          tmdbYear:
            detailsYear,
        },
      );

      return;
    }

    /**
     * Save the corrected metadata.
     */
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
          detailsYear ??
          series.year,

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
          details.vote_average ??
          null,
      },
    });

    result.series.matched++;

    console.log(
      `[Metadata] Matched series "${series.title}"${
        series.year
          ? ` (${series.year})`
          : ""
      } → "${details.name}" (${detailsYear ?? "unknown"}) [TMDB ${details.id}]`,
    );
  } catch (error) {
    result.series.failed++;

    addError(
      result,
      `Series "${series.title}"${
        series.year
          ? ` (${series.year})`
          : ""
      }: ${
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
  /**
   * Existing thumbnail is enough when
   * force mode is disabled.
   */
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
    /**
     * Use the already matched series TMDB ID.
     *
     * Example:
     *
     * Ben 10 (2005)
     *   → TMDB 4686
     *
     * Episode 6:
     *   /tv/4686/season/1/episode/6
     *
     * Ben 10 (2016)
     *   → TMDB 68295
     *
     * Episode 6:
     *   /tv/68295/season/1/episode/6
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

    /**
     * Some episodes do not have artwork on TMDB.
     *
     * Still update title, description and
     * runtime when available.
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

      await prisma.episode.update({
        where: {
          id: episode.id,
        },

        data: {
          title:
            details.name ||
            episode.title,

          description:
            details.overview ||
            null,

          duration:
            details.runtime ??
            null,
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
          details.overview ||
          null,

        duration:
          details.runtime ??
          null,
      },
    });

    result.episodes.matched++;

    console.log(
      `[Metadata] Episode "${episode.season.series.title}" S${String(
        episode.season.number,
      ).padStart(
        2,
        "0",
      )}E${String(
        episode.number,
      ).padStart(
        2,
        "0",
      )} → "${details.name}"`,
    );
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

      orderBy: [
        {
          title: "asc",
        },
        {
          year: "asc",
        },
      ],
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

  /**
   * IMPORTANT:
   *
   * Episodes are loaded AFTER series synchronization.
   *
   * This means their related Series records
   * now contain the corrected TMDB IDs.
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

