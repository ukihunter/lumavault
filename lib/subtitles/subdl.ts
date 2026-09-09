
import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

const SUBDL_API =
  "https://api.subdl.com/api/v1/subtitles";

const SUBDL_DOWNLOAD_BASE =
  "https://dl.subdl.com";

const SUBDL_API_KEY =
  process.env.SUBDL_API_KEY;

export type SubtitleLanguage =
  | "en"
  | "si";

export type SubDLSubtitle = {
  fileId: string;
  language: string;
  languageCode: string;
  release: string | null;
  fileName: string | null;
  hearingImpaired: boolean;
  downloads: number;
  url: string;
  format?: string;
};

type SubDLUnpackFile = {
  file_n_id?: string;
  name?: string;
  release_name?: string | null;
  season?: number;
  episode?: number;
  language?: string;
  hi?: boolean;
  format?: string;
  size?: number;
  md5?: string;
  url?: string;
};

type SubDLSubtitleItem = {
  name?: string;
  url?: string;
  release_name?: string | null;
  language?: string;
  hi?: boolean;
  download_count?: number;
  downloads?: number;
  unpack_files?: SubDLUnpackFile[];
};

type SubDLResponse = {
  status: boolean;
  error?: string;
  subtitles?: SubDLSubtitleItem[];
};

if (!SUBDL_API_KEY) {
  console.warn(
    "[SubDL] SUBDL_API_KEY is not configured.",
  );
}

/* -------------------------------------------------------------------------- */
/* Language                                                                   */
/* -------------------------------------------------------------------------- */

function normalizeLanguage(
  language: string,
): string {
  const value = language
    .trim()
    .toLowerCase();

  switch (value) {
    case "en":
    case "eng":
    case "english":
      return "en";

    case "si":
    case "sin":
    case "sinhala":
      return "si";

    default:
      return value;
  }
}

function isValidLanguage(
  language: string,
): language is SubtitleLanguage {
  return (
    language === "en" ||
    language === "si"
  );
}

/* -------------------------------------------------------------------------- */
/* URL                                                                        */
/* -------------------------------------------------------------------------- */

function toSubDLUrl(
  url: string,
): string {
  const value = url.trim();

  if (value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${SUBDL_DOWNLOAD_BASE}${value}`;
  }

  return `${SUBDL_DOWNLOAD_BASE}/${value}`;
}

/*
 * Never log a SubDL URL directly because the URL can contain the API key.
 */
function safeDownloadLogUrl(
  url: string,
): string {
  try {
    const parsed = new URL(url);

    parsed.searchParams.delete(
      "api_key",
    );

    return parsed.toString();
  } catch {
    return "[subdl-download-url]";
  }
}

function createFileId(
  url: string,
  index: number,
): string {
  return `${index}-${Buffer.from(url).toString(
    "base64url",
  )}`;
}

/* -------------------------------------------------------------------------- */
/* API                                                                        */
/* -------------------------------------------------------------------------- */

async function subDLFetch(
  url: string,
): Promise<SubDLResponse> {
  if (!SUBDL_API_KEY) {
    throw new Error(
      "SUBDL_API_KEY is not configured.",
    );
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data =
    (await response
      .json()
      .catch(() => null)) as
      | SubDLResponse
      | null;

  if (!response.ok) {
    throw new Error(
      data?.error ??
        `SubDL request failed with HTTP ${response.status}`,
    );
  }

  if (!data?.status) {
    throw new Error(
      data?.error ??
        "SubDL subtitle request failed.",
    );
  }

  return data;
}

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

export async function searchMovieSubtitles(
  tmdbId: number,
  language: SubtitleLanguage,
): Promise<SubDLSubtitle[]> {
  if (!SUBDL_API_KEY) {
    throw new Error(
      "SUBDL_API_KEY is not configured.",
    );
  }

  const requestedLanguage =
    normalizeLanguage(language);

  const params = new URLSearchParams({
    api_key: SUBDL_API_KEY,
    tmdb_id: String(tmdbId),
    type: "movie",
    languages:
      requestedLanguage === "si"
        ? "SI"
        : "EN",
    subs_per_page: "30",
    hi: "1",
    unpack: "1",
    client: "custom_integration",
  });

  console.log(
    "[SubDL] Searching subtitles:",
    {
      tmdbId,
      language: requestedLanguage,
    },
  );

  const data = await subDLFetch(
    `${SUBDL_API}?${params.toString()}`,
  );

  const results: SubDLSubtitle[] = [];

  for (
    const subtitle of
      data.subtitles ?? []
  ) {
    const unpackFiles =
      subtitle.unpack_files ?? [];

    /*
     * unpack=1 gives individual raw
     * subtitle-file URLs.
     */
    if (unpackFiles.length > 0) {
      for (
        const file of unpackFiles
      ) {
        if (!file.url) {
          continue;
        }

        const languageCode =
          normalizeLanguage(
            file.language ??
              subtitle.language ??
              "",
          );

        if (
          languageCode !==
          requestedLanguage
        ) {
          continue;
        }

        const url =
          toSubDLUrl(file.url);

        results.push({
          fileId:
            file.file_n_id ??
            createFileId(
              url,
              results.length,
            ),

          language:
            file.language ??
            subtitle.language ??
            language,

          languageCode,

          release:
            file.release_name ??
            subtitle.release_name ??
            null,

          fileName:
            file.name ??
            subtitle.name ??
            null,

          hearingImpaired:
            Boolean(
              file.hi ??
                subtitle.hi ??
                false,
            ),

          downloads:
            subtitle.download_count ??
            subtitle.downloads ??
            0,

          url,

          format:
            file.format
              ?.toLowerCase(),
        });
      }

      continue;
    }

    /*
     * Fallback for a normal subtitle entry.
     */
    if (!subtitle.url) {
      continue;
    }

    const languageCode =
      normalizeLanguage(
        subtitle.language ?? "",
      );

    if (
      languageCode !==
      requestedLanguage
    ) {
      continue;
    }

    const url =
      toSubDLUrl(
        subtitle.url,
      );

    results.push({
      fileId: createFileId(
        url,
        results.length,
      ),

      language:
        subtitle.language ??
        language,

      languageCode,

      release:
        subtitle.release_name ??
        null,

      fileName:
        subtitle.name ??
        null,

      hearingImpaired:
        Boolean(subtitle.hi),

      downloads:
        subtitle.download_count ??
        subtitle.downloads ??
        0,

      url,
    });
  }

  console.log(
    "[SubDL] Search results:",
    results.length,
  );

  return results.sort(
    (a, b) =>
      b.downloads -
      a.downloads,
  );
}

/* -------------------------------------------------------------------------- */
/* File paths                                                                 */
/* -------------------------------------------------------------------------- */

function isSafeMovieId(
  movieId: string,
): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(
    movieId,
  );
}

function subtitleDirectory(
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

function subtitlePath(
  movieId: string,
  language: SubtitleLanguage,
): string {
  return path.join(
    subtitleDirectory(movieId),
    `${language}.vtt`,
  );
}

/* -------------------------------------------------------------------------- */
/* Decoding                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Decode subtitle bytes robustly.
 *
 * Handles:
 * - UTF-8 BOM
 * - UTF-16 LE
 * - UTF-16 BE
 * - normal UTF-8
 */
function decodeSubtitle(
  data: ArrayBuffer,
): string {
  const bytes =
    new Uint8Array(data);

  if (bytes.length === 0) {
    return "";
  }

  /*
   * UTF-8 BOM
   */
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    return new TextDecoder(
      "utf-8",
    ).decode(bytes);
  }

  /*
   * UTF-16 LE BOM
   */
  if (
    bytes.length >= 2 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xfe
  ) {
    return new TextDecoder(
      "utf-16le",
    ).decode(bytes);
  }

  /*
   * UTF-16 BE BOM
   */
  if (
    bytes.length >= 2 &&
    bytes[0] === 0xfe &&
    bytes[1] === 0xff
  ) {
    return decodeUtf16BE(bytes);
  }

  /*
   * Detect UTF-16 without BOM.
   *
   * If a large proportion of alternating
   * bytes are NUL, the file is probably UTF-16.
   */
  let zeroEven = 0;
  let zeroOdd = 0;

  const sampleLength =
    Math.min(
      bytes.length,
      4000,
    );

  for (
    let index = 0;
    index < sampleLength;
    index++
  ) {
    if (
      bytes[index] === 0
    ) {
      if (
        index % 2 === 0
      ) {
        zeroEven++;
      } else {
        zeroOdd++;
      }
    }
  }

  const half =
    Math.max(
      1,
      Math.floor(
        sampleLength / 2,
      ),
    );

  const evenRatio =
    zeroEven / half;

  const oddRatio =
    zeroOdd / half;

  if (oddRatio > 0.25) {
    return new TextDecoder(
      "utf-16le",
    ).decode(bytes);
  }

  if (evenRatio > 0.25) {
    return decodeUtf16BE(bytes);
  }

  return new TextDecoder(
    "utf-8",
  ).decode(bytes);
}

function decodeUtf16BE(
  bytes: Uint8Array,
): string {
  /*
   * Convert UTF-16BE into UTF-16LE.
   * TextDecoder has reliable utf-16le
   * support in Node.
   */
  const converted =
    new Uint8Array(
      bytes.length -
        (bytes.length % 2),
    );

  let offset = 0;

  /*
   * Skip BOM when present.
   */
  if (
    bytes.length >= 2 &&
    bytes[0] === 0xfe &&
    bytes[1] === 0xff
  ) {
    offset = 2;
  }

  let outputIndex = 0;

  for (
    let index = offset;
    index + 1 < bytes.length;
    index += 2
  ) {
    converted[outputIndex++] =
      bytes[index + 1];

    converted[outputIndex++] =
      bytes[index];
  }

  return new TextDecoder(
    "utf-16le",
  ).decode(
    converted.subarray(
      0,
      outputIndex,
    ),
  );
}

/* -------------------------------------------------------------------------- */
/* Normalization                                                              */
/* -------------------------------------------------------------------------- */

function normalizeSubtitleText(
  text: string,
): string {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
}

/* -------------------------------------------------------------------------- */
/* WebVTT                                                                     */
/* -------------------------------------------------------------------------- */

function isWebVtt(
  text: string,
): boolean {
  return text
    .replace(/^\uFEFF/, "")
    .trimStart()
    .startsWith("WEBVTT");
}

function hasWebVttCues(
  text: string,
): boolean {
  const normalized =
    normalizeSubtitleText(text);

  if (!isWebVtt(normalized)) {
    return false;
  }

  return /\d{1,2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{1,2}:\d{2}:\d{2}\.\d{3}/.test(
    normalized,
  );
}

/* -------------------------------------------------------------------------- */
/* SRT                                                                        */
/* -------------------------------------------------------------------------- */

function srtToVtt(
  srt: string,
): string {
  const text =
    normalizeSubtitleText(srt);

  if (!text) {
    throw new Error(
      "Subtitle file is empty.",
    );
  }

  /*
   * Convert:
   *
   * 00:01:02,500
   *
   * to:
   *
   * 00:01:02.500
   */
  const converted =
    text.replace(
      /(\d{1,2}):(\d{2}):(\d{2}),(\d{3})/g,
      "$1:$2:$3.$4",
    );

  const blocks =
    converted
      .split(/\n{2,}/)
      .map(
        (block) =>
          block.trim(),
      )
      .filter(Boolean);

  const output = [
    "WEBVTT",
    "",
  ];

  let cueCount = 0;

  for (
    const block of blocks
  ) {
    const lines =
      block.split("\n");

    /*
     * Remove SRT cue number.
     */
    if (
      lines.length > 0 &&
      /^\d+$/.test(
        lines[0].trim(),
      )
    ) {
      lines.shift();
    }

    const timestampIndex =
      lines.findIndex(
        (line) =>
          line.includes("-->"),
      );

    if (
      timestampIndex === -1
    ) {
      continue;
    }

    const timestamp =
      lines[timestampIndex]
        .trim();

    if (
      !/^\d{1,2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{1,2}:\d{2}:\d{2}\.\d{3}/.test(
        timestamp,
      )
    ) {
      continue;
    }

    const cueText =
      lines
        .slice(
          timestampIndex + 1,
        )
        .join("\n")
        .trim();

    if (!cueText) {
      continue;
    }

    output.push(timestamp);
    output.push(cueText);
    output.push("");

    cueCount++;
  }

  if (cueCount === 0) {
    throw new Error(
      "Subtitle file contains no valid subtitle cues.",
    );
  }

  return output.join("\n");
}

/* -------------------------------------------------------------------------- */
/* ASS / SSA                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Convert ASS/SSA subtitle format into WebVTT.
 *
 * ASS dialogue timestamps look like:
 *
 * Dialogue: 0,0:01:02.50,0:01:05.80,Default,...
 *
 * We keep the actual dialogue text and
 * discard ASS styling tags.
 */
function assToVtt(
  ass: string,
): string {
  const text =
    normalizeSubtitleText(ass);

  if (!text) {
    throw new Error(
      "Subtitle file is empty.",
    );
  }

  const lines =
    text.split("\n");

  const output = [
    "WEBVTT",
    "",
  ];

  let cueCount = 0;

  for (
    const line of lines
  ) {
    if (
      !line.startsWith(
        "Dialogue:",
      )
    ) {
      continue;
    }

    const content =
      line.slice(
        "Dialogue:".length,
      ).trim();

    const parts =
      content.split(",");

    if (parts.length < 10) {
      continue;
    }

    const start =
      parts[1]?.trim();

    const end =
      parts[2]?.trim();

    /*
     * ASS format uses:
     *
     * H:MM:SS.cc
     *
     * Convert to:
     *
     * HH:MM:SS.mmm
     */
    const startTime =
      assTimeToVtt(start);

    const endTime =
      assTimeToVtt(end);

    if (
      !startTime ||
      !endTime
    ) {
      continue;
    }

    /*
     * ASS dialogue text is field 10+
     * because commas are allowed inside
     * the dialogue text.
     */
    let dialogue =
      parts
        .slice(9)
        .join(",");

    /*
     * Convert ASS line breaks.
     */
    dialogue =
      dialogue
        .replace(
          /\\N/gi,
          "\n",
        )
        .replace(
          /\\n/gi,
          "\n",
        )
        .replace(
          /\\h/gi,
          " ",
        );

    /*
     * Remove ASS override tags:
     * {\an8}
     * {\i1}
     * {\pos(...)}
     * etc.
     */
    dialogue =
      dialogue.replace(
        /\{[^}]*\}/g,
        "",
      );

    dialogue =
      dialogue.trim();

    if (!dialogue) {
      continue;
    }

    output.push(
      `${startTime} --> ${endTime}`,
    );

    output.push(dialogue);

    output.push("");

    cueCount++;
  }

  if (cueCount === 0) {
    throw new Error(
      "ASS/SSA subtitle contains no valid dialogue cues.",
    );
  }

  return output.join("\n");
}

function assTimeToVtt(
  value?: string,
): string | null {
  if (!value) {
    return null;
  }

  const match =
    value.match(
      /^(\d+):(\d{2}):(\d{2})\.(\d{2,3})$/,
    );

  if (!match) {
    return null;
  }

  const hours =
    Number(match[1]);

  const minutes =
    Number(match[2]);

  const seconds =
    Number(match[3]);

  const fraction =
    match[4];

  const milliseconds =
    fraction.length === 2
      ? Number(fraction) * 10
      : Number(fraction);

  if (
    minutes > 59 ||
    seconds > 59
  ) {
    return null;
  }

  return [
    String(hours)
      .padStart(2, "0"),

    String(minutes)
      .padStart(2, "0"),

    String(seconds)
      .padStart(2, "0"),

    String(milliseconds)
      .padStart(3, "0"),
  ].join(":");
}

/* -------------------------------------------------------------------------- */
/* Format detection                                                           */
/* -------------------------------------------------------------------------- */

function detectSubtitleFormat(
  text: string,
): "vtt" | "srt" | "ass" | "unknown" {
  const normalized =
    normalizeSubtitleText(text);

  if (
    isWebVtt(normalized)
  ) {
    return "vtt";
  }

  if (
    /(^|\n)\s*\[Script Info\]/i.test(
      normalized,
    ) ||
    /(^|\n)\s*Dialogue:\s*\d+,\d+:/i.test(
      normalized,
    )
  ) {
    return "ass";
  }

  if (
    /-->\s*\d{1,2}:\d{2}:\d{2}/.test(
      normalized,
    )
  ) {
    return "srt";
  }

  return "unknown";
}

/* -------------------------------------------------------------------------- */
/* ZIP                                                                        */
/* -------------------------------------------------------------------------- */

function looksLikeZip(
  contentType: string,
  data: ArrayBuffer,
): boolean {
  const bytes =
    new Uint8Array(data);

  const typeLooksLikeZip =
    contentType
      .toLowerCase()
      .includes("zip");

  const signatureLooksLikeZip =
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;

  return (
    typeLooksLikeZip ||
    signatureLooksLikeZip
  );
}

async function extractSubtitleFromZip(
  data: ArrayBuffer,
): Promise<string> {
  const { unzipSync } =
    await import("fflate");

  const files =
    unzipSync(
      new Uint8Array(data),
    );

  const candidates =
    Object.entries(files)
      .filter(
        ([name]) =>
          /\.(srt|vtt|ass|ssa)$/i.test(
            name,
          ),
      )
      .sort(
        ([a], [b]) => {
          const score = (
            name: string,
          ) => {
            let value = 0;

            if (
              /\.srt$/i.test(name)
            ) {
              value += 100;
            }

            if (
              /\.vtt$/i.test(name)
            ) {
              value += 90;
            }

            if (
              /\.ass$/i.test(name)
            ) {
              value += 80;
            }

            if (
              /\.ssa$/i.test(name)
            ) {
              value += 70;
            }

            if (
              /english|eng/i.test(
                name,
              )
            ) {
              value += 20;
            }

            return value;
          };

          return (
            score(b) -
            score(a)
          );
        },
      );

  if (
    candidates.length === 0
  ) {
    throw new Error(
      "The subtitle archive contains no supported subtitle file.",
    );
  }

  /*
   * Try each candidate until we find
   * a valid subtitle.
   */
  for (
    const [
      fileName,
      content,
    ] of candidates
  ) {
    const text =
      decodeSubtitle(
        content.buffer.slice(
          content.byteOffset,
          content.byteOffset +
            content.byteLength,
        ),
      );

    if (!text.trim()) {
      continue;
    }

    const format =
      detectSubtitleFormat(
        text,
      );

    try {
      switch (format) {
        case "vtt": {
          if (
            !hasWebVttCues(
              text,
            )
          ) {
            throw new Error(
              "VTT contains no cues.",
            );
          }

          console.log(
            "[SubDL] Using VTT from archive:",
            fileName,
          );

          return normalizeSubtitleText(
            text,
          );
        }

        case "srt": {
          const vtt =
            srtToVtt(text);

          console.log(
            "[SubDL] Using SRT from archive:",
            fileName,
          );

          return vtt;
        }

        case "ass": {
          const vtt =
            assToVtt(text);

          console.log(
            "[SubDL] Using ASS/SSA from archive:",
            fileName,
          );

          return vtt;
        }

        default:
          continue;
      }
    } catch {
      continue;
    }
  }

  throw new Error(
    "The subtitle archive contains no valid subtitle cues.",
  );
}

/* -------------------------------------------------------------------------- */
/* Download                                                                   */
/* -------------------------------------------------------------------------- */

export async function downloadMovieSubtitle(
  movieId: string,
  fileUrl: string,
  language: SubtitleLanguage,
): Promise<{
  language: SubtitleLanguage;
  src: string;
}> {
  if (
    !isSafeMovieId(movieId)
  ) {
    throw new Error(
      "Invalid movie ID.",
    );
  }

  if (
    !isValidLanguage(language)
  ) {
    throw new Error(
      "Unsupported subtitle language.",
    );
  }

  if (!fileUrl) {
    throw new Error(
      "Subtitle URL is required.",
    );
  }

  const normalizedUrl =
    toSubDLUrl(fileUrl);

  /*
   * Only allow the official SubDL
   * download host.
   */
  if (
    !normalizedUrl.startsWith(
      `${SUBDL_DOWNLOAD_BASE}/`,
    )
  ) {
    throw new Error(
      "Invalid SubDL subtitle URL.",
    );
  }

  console.log(
    "[SubDL] Downloading subtitle:",
    safeDownloadLogUrl(
      normalizedUrl,
    ),
  );

  const response =
    await fetch(normalizedUrl, {
      method: "GET",
      cache: "no-store",
    });

  if (!response.ok) {
    throw new Error(
      `Subtitle download failed with HTTP ${response.status}`,
    );
  }

  const contentType =
    response.headers.get(
      "content-type",
    ) ?? "";

  const data =
    await response.arrayBuffer();

  console.log(
    "[SubDL] Download response:",
    {
      contentType,
      bytes: data.byteLength,
    },
  );

  if (
    data.byteLength === 0
  ) {
    throw new Error(
      "SubDL returned an empty subtitle file.",
    );
  }

  let subtitleText: string;

  if (
    looksLikeZip(
      contentType,
      data,
    )
  ) {
    subtitleText =
      await extractSubtitleFromZip(
        data,
      );
  } else {
    subtitleText =
      decodeSubtitle(data);

    subtitleText =
      normalizeSubtitleText(
        subtitleText,
      );

    if (!subtitleText) {
      throw new Error(
        "Downloaded subtitle contains no text.",
      );
    }

    const format =
      detectSubtitleFormat(
        subtitleText,
      );

    switch (format) {
      case "vtt":
        if (
          !hasWebVttCues(
            subtitleText,
          )
        ) {
          throw new Error(
            "Downloaded WebVTT contains no subtitle cues.",
          );
        }

        break;

      case "srt":
        subtitleText =
          srtToVtt(
            subtitleText,
          );

        break;

      case "ass":
        subtitleText =
          assToVtt(
            subtitleText,
          );

        break;

      default:
        throw new Error(
          "Unsupported or unrecognized subtitle format.",
        );
    }
  }

  const vtt =
    normalizeSubtitleText(
      subtitleText,
    );

  if (
    !hasWebVttCues(vtt)
  ) {
    throw new Error(
      "Converted subtitle contains no valid subtitle cues.",
    );
  }

  const directory =
    subtitleDirectory(movieId);

  await fs.mkdir(
    directory,
    {
      recursive: true,
    },
  );

  const outputPath =
    subtitlePath(
      movieId,
      language,
    );

  await fs.writeFile(
    outputPath,
    `${vtt}\n`,
    "utf8",
  );

  console.log(
    "[SubDL] Subtitle saved:",
    outputPath,
  );

  return {
    language,
    src: `/api/subtitles/movies/${movieId}/${language}`,
  };
}

/* -------------------------------------------------------------------------- */
/* Cached subtitle                                                            */
/* -------------------------------------------------------------------------- */

export async function getCachedMovieSubtitle(
  movieId: string,
  language: SubtitleLanguage,
): Promise<string | null> {
  if (
    !isSafeMovieId(movieId)
  ) {
    throw new Error(
      "Invalid movie ID.",
    );
  }

  if (
    !isValidLanguage(language)
  ) {
    throw new Error(
      "Unsupported subtitle language.",
    );
  }

  try {
    return await fs.readFile(
      subtitlePath(
        movieId,
        language,
      ),
      "utf8",
    );
  } catch {
    return null;
  }
}

