
import path from "node:path";

export type EpisodeInfo = {
  season: number;
  episode: number;
};

export function parseEpisode(filename: string): EpisodeInfo | null {
  /*
   * Supports:
   *
   * S01E01
   * S01E01E02
   * S01E01E02E03
   * S04E05E06E07
   * S03E37E38E39E40
   *
   * For combined episodes, we treat the file as
   * one logical episode using the first episode number.
   *
   * Example:
   * S04E05E06E07.mp4 -> Season 4, Episode 5
   */

  const match = filename.match(
    /S(\d{1,3})E(\d{1,4})/i,
  );

  if (!match) {
    return null;
  }

  return {
    season: Number(match[1]),
    episode: Number(match[2]),
  };
}

export function cleanMovieTitle(filename: string): string {
  const withoutExtension = path.basename(
    filename,
    path.extname(filename),
  );

  return withoutExtension
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?1080p.*?\)/gi, "")
    .replace(
      /\b(2160p|1080p|720p|480p|4k)\b/gi,
      "",
    )
    .replace(
      /\b(BluRay|WEB-DL|WEBRip|HDTV|DVDRip)\b/gi,
      "",
    )
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getMovieYear(
  filename: string,
): number | null {
  const match = filename.match(/\b(19|20)\d{2}\b/);

  return match ? Number(match[0]) : null;
}

export function parseSeriesTitle(
  relativePath: string,
  filename: string,
): string {
  const episode = parseEpisode(filename);

  if (!episode) {
    return cleanMovieTitle(filename);
  }

  const normalizedPath = relativePath.replaceAll(
    "\\",
    "/",
  );

  const parts = normalizedPath
    .split("/")
    .filter(Boolean);

  if (parts.length <= 1) {
    return cleanMovieTitle(filename);
  }

  const directories = parts.slice(0, -1);

  /*
   * Look for a Season directory.
   *
   * Examples:
   *
   * Series/Season 03/Episode.mkv
   * Series/S03/Episode.mkv
   */
  const seasonIndex = directories.findIndex((part) =>
    /^(season[\s._-]*\d+|s\d{1,3})$/i.test(part),
  );

  if (seasonIndex > 0) {
    return directories[seasonIndex - 1].trim();
  }

  /*
   * Archive example:
   *
   * Ben 10_ Alien Force (2008)/S03E18.mp4
   *
   * The first directory is the series.
   */
  if (directories.length === 1) {
    return directories[0].trim();
  }

  /*
   * Fallback to the directory immediately
   * containing the episode.
   */
  return directories[directories.length - 1].trim();
}

