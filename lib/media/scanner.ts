
import { prisma } from "@/lib/db/prisma";

import { collectFilesystemMedia } from "./filesystem-scanner";
import { collectArchiveMedia } from "./archive-scanner";
import {
  cleanMovieTitle,
  getMovieYear,
  parseEpisode,
  parseSeriesTitle,
} from "./parser";
import type { ScanMedia } from "./types";
import {
  syncSeriesMetadata,
} from "@/lib/metadata/sync";
export type ScanResult = {
  libraryId: string;
  libraryName: string;
  scannedFiles: number;
  scannedArchives: number;
  added: number;
  updated: number;
  skipped: number;
  skippedDetails: string[];
  errors: number;
  errorDetails: string[];
};

function getSeriesYear(
  media: ScanMedia,
): number | null {
  const candidates: string[] = [];

  if (media.archivePath) {
    candidates.push(media.archivePath);
  }

  if (media.filePath) {
    candidates.push(media.filePath);
  }

  if (media.relativePath) {
    candidates.push(media.relativePath);
  }

  candidates.push(media.filename);

  for (const value of candidates) {
    if (!value) {
      continue;
    }

    const match = value.match(
      /\b((?:19|20)\d{2})\b/,
    );

    if (!match) {
      continue;
    }

    const year = Number(match[1]);

    if (
      Number.isInteger(year) &&
      year >= 1900 &&
      year <= 2100
    ) {
      return year;
    }
  }

  return getMovieYear(media.filename);
}

function getSeriesDisplayName(
  title: string,
  year: number | null,
): string {
  return year
    ? `${title} (${year})`
    : title;
}

export async function scanLibrary(
  libraryId: string,
): Promise<ScanResult> {
  const library =
    await prisma.library.findUnique({
      where: {
        id: libraryId,
      },
    });

  if (!library) {
    throw new Error("Library not found");
  }

  const filesystemMedia =
    await collectFilesystemMedia(
      library.path,
      library.path,
    );

  const archiveMedia =
    await collectArchiveMedia(
      library.path,
      library.path,
    );

  const media: ScanMedia[] = [
    ...filesystemMedia,
    ...archiveMedia,
  ];

  const result: ScanResult = {
    libraryId: library.id,
    libraryName: library.name,
    scannedFiles:
      filesystemMedia.length,
    scannedArchives:
      archiveMedia.length,
    added: 0,
    updated: 0,
    skipped: 0,
    skippedDetails: [],
    errors: 0,
    errorDetails: [],
  };
const touchedSeriesIds = new Set<string>();
  for (const item of media) {
    try {
      if (library.type === "MOVIES") {
        await scanMovie(
          library.id,
          item,
          result,
        );
        continue;
      }

      if (library.type === "SERIES") {
        await scanEpisode(
          library.id,
          item,
          result,
          touchedSeriesIds,
        );
        continue;
      }

      if (
        parseEpisode(
          item.filename,
          item.relativePath,
        )
      ) {
        await scanEpisode(
          library.id,
          item,
          result,
           touchedSeriesIds,
        );
      } else {
        await scanMovie(
          library.id,
          item,
          result,
        );
      }
    } catch (error) {
      result.errors++;

      result.errorDetails.push(
        `${getMediaDisplayPath(item)}: ${
          error instanceof Error
            ? error.message
            : "Unknown error"
        }`,
      );
    }
  }

  if (touchedSeriesIds.size > 0) {
    console.log(
      `[LumaVault] Syncing metadata for ${touchedSeriesIds.size} series...`,
    );

    for (const seriesId of touchedSeriesIds) {
      try {
        const metadataResult =
          await syncSeriesMetadata(
            seriesId,
            {
              force: false,
              syncEpisodes: true,
            },
          );

        console.log(
          "[LumaVault] Series metadata sync completed:",
          {
            seriesId,
            matched:
              metadataResult.series.matched,
            skipped:
              metadataResult.series.skipped,
            failed:
              metadataResult.series.failed,
            episodes:
              metadataResult.episodes.total,
            episodeMatched:
              metadataResult.episodes.matched,
            episodeSkipped:
              metadataResult.episodes.skipped,
            episodeFailed:
              metadataResult.episodes.failed,
          },
        );

        if (
          metadataResult.errors.length > 0
        ) {
          console.warn(
            "[LumaVault] Metadata sync warnings:",
            metadataResult.errors,
          );
        }
      } catch (error) {
        console.error(
          `[LumaVault] Failed to sync metadata for series ${seriesId}:`,
          error,
        );
      }
    }
  }



  return result;
}

async function scanMovie(
  libraryId: string,
  media: ScanMedia,
  result: ScanResult,
) {
  const title = cleanMovieTitle(
    media.filename,
  );

  const year = getMovieYear(
    media.filename,
  );

  const existingSource =
    await findExistingSource(media);

  if (existingSource?.movie) {
    await prisma.movie.update({
      where: {
        id: existingSource.movie.id,
      },
      data: {
        title,
        year,
        libraryId,
      },
    });

    await updateMediaSource(
      existingSource.id,
      media,
    );

    result.updated++;
    return;
  }

  if (existingSource) {
    throw new Error(
      "Media source exists but is already attached to another media item.",
    );
  }

  await prisma.movie.create({
    data: {
      title,
      year,
      libraryId,
      mediaSource: {
        create:
          createMediaSourceData(media),
      },
    },
  });

  result.added++;
}

async function scanEpisode(
  libraryId: string,
  media: ScanMedia,
  result: ScanResult,
   touchedSeriesIds: Set<string>,
) {
  const episodeInfo = parseEpisode(
    media.filename,
    media.relativePath,
  );

  if (!episodeInfo) {
    result.skipped++;

    result.skippedDetails.push(
      [
        "NO_EPISODE_PATTERN",
        getMediaDisplayPath(media),
        `filename="${media.filename}"`,
        `relativePath="${media.relativePath}"`,
      ].join(" | "),
    );

    return;
  }

  const seriesTitle =
    parseSeriesTitle(
      media.relativePath,
      media.filename,
    );

  if (!seriesTitle) {
    result.skipped++;

    result.skippedDetails.push(
      [
        "NO_SERIES_TITLE",
        getMediaDisplayPath(media),
        `filename="${media.filename}"`,
        `relativePath="${media.relativePath}"`,
      ].join(" | "),
    );

    return;
  }

  const seriesYear =
    getSeriesYear(media);

  console.log(
    "[LumaVault] Episode parsed:",
    {
      filename: media.filename,
      relativePath: media.relativePath,
      season: episodeInfo.season,
      episode: episodeInfo.episode,
      seriesTitle,
      seriesYear,
      source:
        getMediaDisplayPath(media),
    },
  );

  const existingSource =
    await findExistingSource(media);

  if (existingSource?.episode) {
    const episode =
      existingSource.episode;

    await prisma.episode.update({
      where: {
        id: episode.id,
      },
      data: {
        title: `Episode ${episodeInfo.episode}`,
        number: episodeInfo.episode,
      },
    });

    await updateMediaSource(
      existingSource.id,
      media,
    );

    result.updated++;
    return;
  }

  if (existingSource) {
    throw new Error(
      "Media source exists but is already attached to another media item.",
    );
  }

  let series =
    await prisma.series.findFirst({
      where: {
        libraryId,
        title: seriesTitle,
        year: seriesYear,
      },
    });

  if (!series) {
    series =
      await prisma.series.create({
        data: {
          title: seriesTitle,
          year: seriesYear,
          libraryId,
        },
      });

    console.log(
      "[LumaVault] Created series:",
      {
        id: series.id,
        title: series.title,
        year: series.year,
      },
    );
  } else {
    if (
      series.year === null &&
      seriesYear !== null
    ) {
      series =
        await prisma.series.update({
          where: {
            id: series.id,
          },
          data: {
            year: seriesYear,
          },
        });

      console.log(
        "[LumaVault] Repaired series year:",
        {
          id: series.id,
          title: series.title,
          year: series.year,
        },
      );
    }
  }
touchedSeriesIds.add(series.id);
  let season =
    await prisma.season.findUnique({
      where: {
        seriesId_number: {
          seriesId: series.id,
          number: episodeInfo.season,
        },
      },
    });

  if (!season) {
    season =
      await prisma.season.create({
        data: {
          seriesId: series.id,
          number: episodeInfo.season,
        },
      });
  }

  const existingEpisode =
    await prisma.episode.findUnique({
      where: {
        seasonId_number: {
          seasonId: season.id,
          number: episodeInfo.episode,
        },
      },
      include: {
        mediaSource: true,
      },
    });

  if (existingEpisode) {
    result.skipped++;

    const existingSourceDescription =
      existingEpisode.mediaSource
        ? getMediaSourceDescription(
            existingEpisode.mediaSource,
          )
        : "NO_MEDIA_SOURCE";

    result.skippedDetails.push(
      [
        "DUPLICATE_EPISODE",
        getMediaDisplayPath(media),
        `resolved=S${String(
          episodeInfo.season,
        ).padStart(
          2,
          "0",
        )}E${String(
          episodeInfo.episode,
        ).padStart(
          2,
          "0",
        )}`,
        `series="${getSeriesDisplayName(
          seriesTitle,
          seriesYear,
        )}"`,
        `existingSource=${existingSourceDescription}`,
      ].join(" | "),
    );

    return;
  }

  await prisma.episode.create({
    data: {
      number: episodeInfo.episode,
      title: `Episode ${episodeInfo.episode}`,
      seasonId: season.id,
      mediaSource: {
        create:
          createMediaSourceData(media),
      },
    },
  });

  result.added++;
}

async function findExistingSource(
  media: ScanMedia,
) {
  if (media.sourceType === "FILE") {
    if (!media.filePath) {
      throw new Error(
        "FILE media is missing filePath.",
      );
    }

    return prisma.mediaSource.findUnique({
      where: {
        filePath: media.filePath,
      },
      include: {
        movie: true,
        episode: true,
      },
    });
  }

  if (!media.archivePath) {
    throw new Error(
      "ARCHIVE media is missing archivePath.",
    );
  }

  if (!media.entryPath) {
    throw new Error(
      "ARCHIVE media is missing entryPath.",
    );
  }

  return prisma.mediaSource.findUnique({
    where: {
      archivePath_entryPath: {
        archivePath:
          media.archivePath,
        entryPath:
          media.entryPath,
      },
    },
    include: {
      movie: true,
      episode: true,
    },
  });
}

function createMediaSourceData(
  media: ScanMedia,
) {
  if (media.sourceType === "FILE") {
    if (!media.filePath) {
      throw new Error(
        "FILE media is missing filePath.",
      );
    }

    return {
      type: "FILE" as const,
      filePath: media.filePath,
    };
  }

  if (!media.archivePath) {
    throw new Error(
      "ARCHIVE media is missing archivePath.",
    );
  }

  if (!media.entryPath) {
    throw new Error(
      "ARCHIVE media is missing entryPath.",
    );
  }

  return {
    type: "ARCHIVE" as const,
    archivePath: media.archivePath,
    entryPath: media.entryPath,
  };
}

async function updateMediaSource(
  sourceId: string,
  media: ScanMedia,
) {
  if (media.sourceType === "FILE") {
    if (!media.filePath) {
      throw new Error(
        "FILE media is missing filePath.",
      );
    }

    await prisma.mediaSource.update({
      where: {
        id: sourceId,
      },
      data: {
        type: "FILE",
        filePath: media.filePath,
        archivePath: null,
        entryPath: null,
      },
    });

    return;
  }

  if (
    !media.archivePath ||
    !media.entryPath
  ) {
    throw new Error(
      "ARCHIVE media is missing source information.",
    );
  }

  await prisma.mediaSource.update({
    where: {
      id: sourceId,
    },
    data: {
      type: "ARCHIVE",
      filePath: null,
      archivePath:
        media.archivePath,
      entryPath:
        media.entryPath,
    },
  });
}

function getMediaSourceDescription(
  source: {
    type: "FILE" | "ARCHIVE";
    filePath: string | null;
    archivePath: string | null;
    entryPath: string | null;
  },
): string {
  if (source.type === "FILE") {
    return (
      source.filePath ??
      "UNKNOWN_FILE"
    );
  }

  return [
    source.archivePath,
    source.entryPath,
  ]
    .filter(Boolean)
    .join("::");
}

function getMediaDisplayPath(
  media: ScanMedia,
): string {
  if (media.sourceType === "FILE") {
    return (
      media.filePath ??
      media.filename
    );
  }

  return [
    media.archivePath,
    media.entryPath,
  ]
    .filter(Boolean)
    .join("::");
}
