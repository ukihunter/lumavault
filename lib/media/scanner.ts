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

export async function scanLibrary(
  libraryId: string,
): Promise<ScanResult> {
  const library = await prisma.library.findUnique({
    where: {
      id: libraryId,
    },
  });

  if (!library) {
    throw new Error("Library not found");
  }

  /**
   * Discover normal video files.
   */
  const filesystemMedia = await collectFilesystemMedia(
    library.path,
    library.path,
  );

  /**
   * Discover video files inside ZIP archives.
   *
   * Nothing is extracted here.
   */
  const archiveMedia = await collectArchiveMedia(
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

    scannedFiles: filesystemMedia.length,
    scannedArchives: archiveMedia.length,

    added: 0,
    updated: 0,
    skipped: 0,

    skippedDetails: [],

    errors: 0,
    errorDetails: [],
  };

 for (const item of media) {
  try {
    // Movies-only library
    if (library.type === "MOVIES") {
      await scanMovie(
        library.id,
        item,
        result,
      );

      continue;
    }

    // Series-only library
    if (library.type === "SERIES") {
      await scanEpisode(
        library.id,
        item,
        result,
      );

      continue;
    }

    // Mixed library:
    // Automatically determine whether this is
    // an episode or a movie.
    if (parseEpisode(item.filename)) {
      await scanEpisode(
        library.id,
        item,
        result,
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

  return result;
}

/**
 * Scan a movie media source.
 */
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

  /**
   * Find existing source using the
   * physical source identity.
   */
  const existingSource =
    await findExistingSource(media);

  /**
   * Existing source already belongs to a movie.
   *
   * This is a normal rescan/update.
   */
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

  /**
   * A source exists but does not belong
   * to a movie.
   */
  if (existingSource) {
    throw new Error(
      "Media source exists but is already attached to another media item.",
    );
  }

  /**
   * Create movie and MediaSource together.
   */
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

/**
 * Scan a TV episode.
 *
 * Option A:
 *
 * S04E05E06E07.mp4
 *
 * becomes:
 *
 * Season 4 / Episode 5
 *
 * We intentionally do not create E06/E07.
 */
async function scanEpisode(
  libraryId: string,
  media: ScanMedia,
  result: ScanResult,
) {
  /**
   * Parse SxxExx from filename.
   */
  const episodeInfo = parseEpisode(
    media.filename,
  );

  /**
   * No SxxExx pattern.
   */
  if (!episodeInfo) {
    result.skipped++;

    result.skippedDetails.push(
      [
        "NO_EPISODE_PATTERN",
        getMediaDisplayPath(media),
        `filename="${media.filename}"`,
      ].join(" | "),
    );

    return;
  }

  /**
   * Determine series title.
   */
  const seriesTitle = parseSeriesTitle(
    media.relativePath,
    media.filename,
  );

  /**
   * Could not determine series.
   */
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

  /**
   * IMPORTANT:
   *
   * Check the physical source first.
   *
   * This makes rescanning safe and prevents
   * unnecessary Series/Season creation.
   */
  const existingSource =
    await findExistingSource(media);

  /**
   * Existing physical source already belongs
   * to an episode.
   *
   * This is a normal rescan/update.
   */
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

  /**
   * The physical source exists but belongs
   * to another media type.
   */
  if (existingSource) {
    throw new Error(
      "Media source exists but is already attached to another media item.",
    );
  }

  /**
   * Find or create the series.
   */
  let series =
    await prisma.series.findFirst({
      where: {
        libraryId,
        title: seriesTitle,
      },
    });

  if (!series) {
    series =
      await prisma.series.create({
        data: {
          title: seriesTitle,
          libraryId,
        },
      });
  }

  /**
   * Find or create the season.
   */
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

  /**
   * Check whether this logical episode
   * already exists.
   *
   * Example:
   *
   * S04E05.mp4
   * S04E05E06E07.mp4
   *
   * Both resolve to:
   *
   * Season 4 / Episode 5
   *
   * Option A means we keep only the first
   * logical episode source.
   */
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
        ).padStart(2, "0")}E${String(
          episodeInfo.episode,
        ).padStart(2, "0")}`,
        `series="${seriesTitle}"`,
        `existingSource=${existingSourceDescription}`,
      ].join(" | "),
    );

    return;
  }

  /**
   * Create the episode and MediaSource
   * together.
   */
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

/**
 * Find an existing MediaSource using
 * the correct identity for its source type.
 */
async function findExistingSource(
  media: ScanMedia,
) {
  /**
   * Normal filesystem file.
   */
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

  /**
   * ZIP/archive entry.
   */
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
        archivePath: media.archivePath,
        entryPath: media.entryPath,
      },
    },
    include: {
      movie: true,
      episode: true,
    },
  });
}

/**
 * Create Prisma MediaSource data.
 */
function createMediaSourceData(
  media: ScanMedia,
) {
  /**
   * Normal filesystem file.
   */
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

  /**
   * ZIP/archive entry.
   */
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

/**
 * Update an existing MediaSource.
 */
async function updateMediaSource(
  sourceId: string,
  media: ScanMedia,
) {
  /**
   * Normal filesystem file.
   */
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

  /**
   * ZIP/archive entry.
   */
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
      archivePath: media.archivePath,
      entryPath: media.entryPath,
    },
  });
}

/**
 * Human-readable source description.
 */
function getMediaSourceDescription(
  source: {
    type: "FILE" | "ARCHIVE";
    filePath: string | null;
    archivePath: string | null;
    entryPath: string | null;
  },
): string {
  if (source.type === "FILE") {
    return source.filePath ?? "UNKNOWN_FILE";
  }

  return [
    source.archivePath,
    source.entryPath,
  ]
    .filter(Boolean)
    .join("::");
}

/**
 * Human-readable path for scanner
 * errors and skipped entries.
 */
function getMediaDisplayPath(
  media: ScanMedia,
): string {
  if (media.sourceType === "FILE") {
    return (
      media.filePath ?? media.filename
    );
  }

  return [
    media.archivePath,
    media.entryPath,
  ]
    .filter(Boolean)
    .join("::");
}