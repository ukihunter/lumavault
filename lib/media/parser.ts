
import path from "node:path";

export type EpisodeInfo = {
  season: number;
  episode: number;
};

export function parseEpisode(
  filename: string,
  relativePath?: string,
): EpisodeInfo | null {
  const standardMatch = filename.match(
    /S(\d{1,3})E(\d{1,4})/i,
  );

  if (standardMatch) {
    const season = Number(standardMatch[1]);
    const episode = Number(standardMatch[2]);

    if (
      Number.isInteger(season) &&
      Number.isInteger(episode) &&
      season > 0 &&
      episode > 0
    ) {
      return {
        season,
        episode,
      };
    }
  }

  const numericEpisodeMatch = filename.match(
    /(?:^|\.)(\d{3})(?:\.|$)/,
  );

  if (!numericEpisodeMatch || !relativePath) {
    return null;
  }

  const episode = Number(numericEpisodeMatch[1]);

  if (
    !Number.isInteger(episode) ||
    episode < 1 ||
    episode > 999
  ) {
    return null;
  }

  const normalizedPath = relativePath.replaceAll(
    "\\",
    "/",
  );

  const parts = normalizedPath
    .split("/")
    .filter(Boolean);

  for (let i = parts.length - 1; i >= 0; i--) {
    const seasonMatch = parts[i].match(
      /\bSeason[\s._-]*(\d{1,3})\b/i,
    );

    if (seasonMatch) {
      const season = Number(seasonMatch[1]);

      if (
        Number.isInteger(season) &&
        season > 0 &&
        season <= 999
      ) {
        return {
          season,
          episode,
        };
      }
    }

    const shortSeasonMatch = parts[i].match(
      /^S(\d{1,3})$/i,
    );

    if (shortSeasonMatch) {
      const season = Number(shortSeasonMatch[1]);

      if (
        Number.isInteger(season) &&
        season > 0 &&
        season <= 999
      ) {
        return {
          season,
          episode,
        };
      }
    }
  }

  return null;
}

export function cleanMovieTitle(
  filename: string,
): string {
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
  const match = filename.match(
    /\b(19|20)\d{2}\b/,
  );

  return match ? Number(match[0]) : null;
}

export function parseSeriesTitle(
  relativePath: string,
  filename: string,
): string {
  const episode = parseEpisode(
    filename,
    relativePath,
  );

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

  for (let i = directories.length - 1; i >= 0; i--) {
    const part = directories[i];

    const seasonMatch = part.match(
      /\bSeason[\s._-]*(\d{1,3})\b/i,
    );

    if (!seasonMatch) {
      continue;
    }

    const title = part
      .replace(
        /\s*[-._]?\s*Season[\s._-]*\d{1,3}\b/gi,
        "",
      )
      .replace(
        /\.(zip|rar|7z)$/i,
        "",
      )
      .trim();

    if (title) {
      return title;
    }

    if (i > 0) {
      return directories[i - 1]
        .replace(
          /\.(zip|rar|7z)$/i,
          "",
        )
        .trim();
    }
  }

  for (let i = directories.length - 1; i >= 0; i--) {
    if (/^S\d{1,3}$/i.test(directories[i])) {
      if (i > 0) {
        return directories[i - 1]
          .replace(
            /\.(zip|rar|7z)$/i,
            "",
          )
          .trim();
      }
    }
  }

  if (directories.length === 1) {
    return directories[0]
      .replace(
        /\.(zip|rar|7z)$/i,
        "",
      )
      .trim();
  }

  return directories[
    directories.length - 1
  ]
    .replace(
      /\.(zip|rar|7z)$/i,
      "",
    )
    .trim();
}
