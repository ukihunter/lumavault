
import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

const OPEN_SUBTITLES_API =
  "https://api.opensubtitles.com/api/v1";

const APP_NAME = "LumaVault";
const APP_VERSION = "1.0.0";

const API_KEY =
  process.env.OPEN_SUBTITLES_API_KEY;

const USERNAME =
  process.env.OPEN_SUBTITLES_USERNAME;

const PASSWORD =
  process.env.OPEN_SUBTITLES_PASSWORD;

type OpenSubtitlesLoginResponse = {
  token: string;
  base_url?: string;
  status: number;

  user?: {
    allowed_downloads?: number;
    remaining_downloads?: number;
    vip?: boolean;
  };
};

type OpenSubtitlesSearchResult = {
  id: string;

  attributes: {
    language: string;
    download_count?: number;
    hearing_impaired?: boolean;
    release?: string | null;

    feature_details?: {
      movie_name?: string | null;
      year?: number | null;
      tmdb_id?: number | null;
      imdb_id?: number | null;
    };

    files?: Array<{
      file_id: number;
      file_name?: string;
    }>;
  };
};

type OpenSubtitlesSearchResponse = {
  data?: OpenSubtitlesSearchResult[];
};

type OpenSubtitlesDownloadResponse = {
  link?: string;
  file_name?: string;
  message?: string;
  remaining?: number;
};

/* -------------------------------------------------------------------------- */
/* Authentication                                                              */
/* -------------------------------------------------------------------------- */

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getOpenSubtitlesToken(): Promise<string> {
  if (
    cachedToken &&
    Date.now() < tokenExpiresAt
  ) {
    return cachedToken;
  }

  if (
    !API_KEY ||
    !USERNAME ||
    !PASSWORD
  ) {
    throw new Error(
      "OpenSubtitles credentials are not configured",
    );
  }

  const response =
    await fetch(
      `${OPEN_SUBTITLES_API}/login`,
      {
        method: "POST",

        headers: {
          "Api-Key": API_KEY,
          "User-Agent": `${APP_NAME} v${APP_VERSION}`,
          "Content-Type":
            "application/json",
          Accept:
            "application/json",
        },

        body: JSON.stringify({
          username: USERNAME,
          password: PASSWORD,
        }),

        cache: "no-store",
      },
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `OpenSubtitles login failed (${response.status}): ${text}`,
    );
  }

  const data =
    (await response.json()) as OpenSubtitlesLoginResponse;

  if (!data.token) {
    throw new Error(
      "OpenSubtitles login did not return a token",
    );
  }

  cachedToken = data.token;

  /*
   * OpenSubtitles documents JWT tokens as valid for
   * approximately 12 hours. We refresh slightly early.
   */
  tokenExpiresAt =
    Date.now() +
    11 * 60 * 60 * 1000;

  return data.token;
}

/* -------------------------------------------------------------------------- */
/* API request                                                                 */
/* -------------------------------------------------------------------------- */

async function openSubtitlesFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  if (!API_KEY) {
    throw new Error(
      "OPEN_SUBTITLES_API_KEY is not configured",
    );
  }

  const token =
    await getOpenSubtitlesToken();

  const response =
    await fetch(url, {
      ...init,

      headers: {
        "Api-Key": API_KEY,
        "User-Agent": `${APP_NAME} v${APP_VERSION}`,
        Accept:
          "application/json",

        Authorization:
          `Bearer ${token}`,

        ...(init?.headers ?? {}),
      },

      cache: "no-store",
    });

  /*
   * Token may have expired.
   * Clear it and retry once.
   */
  if (response.status === 401) {
    cachedToken = null;
    tokenExpiresAt = 0;

    const retryToken =
      await getOpenSubtitlesToken();

    const retryResponse =
      await fetch(url, {
        ...init,

        headers: {
          "Api-Key": API_KEY,
          "User-Agent":
            `${APP_NAME} v${APP_VERSION}`,
          Accept:
            "application/json",

          Authorization:
            `Bearer ${retryToken}`,

          ...(init?.headers ?? {}),
        },

        cache: "no-store",
      });

    if (!retryResponse.ok) {
      const text =
        await retryResponse.text();

      throw new Error(
        `OpenSubtitles request failed (${retryResponse.status}): ${text}`,
      );
    }

    return retryResponse.json() as Promise<T>;
  }

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `OpenSubtitles request failed (${response.status}): ${text}`,
    );
  }

  return response.json() as Promise<T>;
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

export type SubtitleSearchItem = {
  fileId: number;
  language: string;
  downloadCount: number;
  hearingImpaired: boolean;
  release: string | null;
  fileName: string | null;
};

export async function searchMovieSubtitles(
  tmdbId: number,
  languages: string[] = [
    "en",
    "si",
  ],
): Promise<
  SubtitleSearchItem[]
> {
  const languageParam =
    languages.join(",");

  const url =
    new URL(
      `${OPEN_SUBTITLES_API}/subtitles`,
    );

  url.searchParams.set(
    "tmdb_id",
    String(tmdbId),
  );

  url.searchParams.set(
    "languages",
    languageParam,
  );

  url.searchParams.set(
    "order_by",
    "download_count",
  );

  url.searchParams.set(
    "order_direction",
    "desc",
  );

  const response =
    await openSubtitlesFetch<OpenSubtitlesSearchResponse>(
      url.toString(),
    );

  const results =
    response.data ?? [];

  return results
    .flatMap((item) => {
      const file =
        item.attributes.files?.[0];

      if (!file) {
        return [];
      }

      return [
        {
          fileId: file.file_id,

          language:
            item.attributes.language,

          downloadCount:
            item.attributes
              .download_count ?? 0,

          hearingImpaired:
            item.attributes
              .hearing_impaired ??
            false,

          release:
            item.attributes.release ??
            null,

          fileName:
            file.file_name ?? null,
        },
      ];
    });
}

/* -------------------------------------------------------------------------- */
/* Download                                                                    */
/* -------------------------------------------------------------------------- */

async function downloadSubtitle(
  fileId: number,
): Promise<{
  content: string;
  fileName: string;
}> {
  const response =
    await openSubtitlesFetch<OpenSubtitlesDownloadResponse>(
      `${OPEN_SUBTITLES_API}/download`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          file_id: fileId,
          sub_format: "srt",
        }),
      },
    );

  if (!response.link) {
    throw new Error(
      response.message ??
        "OpenSubtitles did not return a download URL",
    );
  }

  const subtitleResponse =
    await fetch(
      response.link,
      {
        cache: "no-store",
      },
    );

  if (!subtitleResponse.ok) {
    throw new Error(
      `Failed to download subtitle file (${subtitleResponse.status})`,
    );
  }

  const content =
    await subtitleResponse.text();

  return {
    content,

    fileName:
      response.file_name ??
      "subtitle.srt",
  };
}

/* -------------------------------------------------------------------------- */
/* SRT → VTT                                                                   */
/* -------------------------------------------------------------------------- */

function srtToVtt(
  srt: string,
): string {
  let text =
    srt
      // Remove UTF-8 BOM.
      .replace(/^\uFEFF/, "")
      // Normalize line endings.
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();

  /*
   * SRT timestamps:
   *
   * 00:00:01,500 --> 00:00:03,000
   *
   * WebVTT uses:
   *
   * 00:00:01.500 --> 00:00:03.000
   */
  text =
    text.replace(
      /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
      "$1.$2",
    );

  return `WEBVTT\n\n${text}\n`;
}

/* -------------------------------------------------------------------------- */
/* Local cache                                                                 */
/* -------------------------------------------------------------------------- */


/* -------------------------------------------------------------------------- */
/* Movie subtitle cache                                                       */
/* -------------------------------------------------------------------------- */

function getSubtitleDirectory(
  movieId: string,
): string {
  return path.join(
    process.cwd(),
    "data",
    "subtitles",
    "movies",
    movieId,
  );
}

function getSubtitleFilePath(
  movieId: string,
  language: string,
): string {
  return path.join(
    getSubtitleDirectory(movieId),
    `${language}.vtt`,
  );
}

export async function getCachedMovieSubtitle(
  movieId: string,
  language: string,
): Promise<string | null> {
  const filePath =
    getSubtitleFilePath(
      movieId,
      language,
    );

  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Download selected subtitle                                                 */
/* -------------------------------------------------------------------------- */

export async function downloadMovieSubtitle(
  movieId: string,
  fileId: number,
  language: string,
): Promise<string> {
  const existing =
    await getCachedMovieSubtitle(
      movieId,
      language,
    );

  if (existing) {
    return existing;
  }

  if (!Number.isInteger(fileId) || fileId <= 0) {
    throw new Error(
      "Invalid OpenSubtitles file ID",
    );
  }

  const downloaded =
    await downloadSubtitle(fileId);

  const vtt =
    srtToVtt(
      downloaded.content,
    );

  const directory =
    getSubtitleDirectory(
      movieId,
    );

  await fs.mkdir(
    directory,
    {
      recursive: true,
    },
  );

  const filePath =
    getSubtitleFilePath(
      movieId,
      language,
    );

  await fs.writeFile(
    filePath,
    vtt,
    "utf8",
  );

  return filePath;
}

