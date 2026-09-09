
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

  /*
   * Discover normal video files.
   */
  const filesystemMedia = await collectFilesystemMedia(
    library.path,
    library.path,
  );

  /*
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

    errors: 0,
    errorDetails: [],
  };

  for (const item of media) {
    try {
      if (library.type === "MOVIES") {
        await scanMovie(library.id, item, result);
        continue;
      }

      await scanEpisode(library.id, item, result);
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
  const title = cleanMovieTitle(media.filename);
  const year = getMovieYear(media.filename);

  /*
   * Find existing source using the physical source identity.
   */
  const existingSource = await findExistingSource(media);

  /*
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

  /*
   * A source exists but does not belong to a movie.
   *
   * It may belong to an episode, which means the same
   * physical media source is being interpreted differently
   * by the library type.
   */
  if (existingSource) {
    throw new Error(
      "Media source exists but is already attached to another media item.",
    );
  }

  /*
   * Create the movie and its MediaSource together.
   */
  await prisma.movie.create({
    data: {
      title,
      year,
      libraryId,

      mediaSource: {
        create: createMediaSourceData(media),
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
 * A filename such as:
 *
 *   S04E05E06E07.mp4
 *
 * is treated as ONE logical episode:
 *
 *   Season 4 / Episode 5
 *
 * We do not create Episode 5, 6 and 7 separately.
 */
async function scanEpisode(
  libraryId: string,
  media: ScanMedia,
  result: ScanResult,
) {
  const episodeInfo = parseEpisode(media.filename);

  /*
   * The file does not contain an SxxExx pattern,
   * so it cannot currently be identified as an episode.
   */
  if (!episodeInfo) {
    result.skipped++;
    return;
  }

  /*
   * Determine the series before creating anything.
   */
  const seriesTitle = parseSeriesTitle(
    media.relativePath,
    media.filename,
  );

  if (!seriesTitle) {
    result.skipped++;
    return;
  }

  /*
   * IMPORTANT:
   *
   * Check the physical source first.
   *
   * This makes rescanning safe and prevents us from
   * creating Series/Season records unnecessarily.
   */
  const existingSource = await findExistingSource(media);

  /*
   * Existing source already belongs to an episode.
   *
   * This is a normal rescan/update.
   */
  if (existingSource?.episode) {
    const episode = existingSource.episode;

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

  /*
   * The physical source already exists but belongs to
   * another media type.
   */
  if (existingSource) {
    throw new Error(
      "Media source exists but is already attached to another media item.",
    );
  }

  /*
   * Find or create the series.
   */
  let series = await prisma.series.findFirst({
    where: {
      libraryId,
      title: seriesTitle,
    },
  });

  if (!series) {
    series = await prisma.series.create({
      data: {
        title: seriesTitle,
        libraryId,
      },
    });
  }

  /*
   * Find or create the season.
   */
  let season = await prisma.season.findUnique({
    where: {
      seriesId_number: {
        seriesId: series.id,
        number: episodeInfo.season,
      },
    },
  });

  if (!season) {
    season = await prisma.season.create({
      data: {
        seriesId: series.id,
        number: episodeInfo.season,
      },
    });
  }

  /*
   * Check whether this logical episode already exists.
   *
   * This can happen with combined episode files.
   *
   * Example:
   *
   *   S04E05.mp4
   *   S04E05E06E07.mp4
   *
   * Both resolve to Season 4 / Episode 5.
   *
   * Since Option A treats the combined file as one logical
   * episode, we must not violate the unique constraint on:
   *
   *   @@unique([seasonId, number])
   */
  const existingEpisode = await prisma.episode.findUnique({
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
    /*
     * If the episode already has a source, do not create
     * another Episode or MediaSource for the same logical
     * episode.
     *
     * The physical source was already checked above, so this
     * is a different source representing the same episode.
     */
    result.skipped++;

    return;
  }

  /*
   * Create the episode and its MediaSource together.
   *
   * A combined filename such as S04E05E06E07.mp4 becomes:
   *
   *   number: 5
   *   title: "Episode 5"
   *
   * The original combined filename remains available through
   * MediaSource.entryPath or MediaSource.filePath.
   */
  await prisma.episode.create({
    data: {
      number: episodeInfo.episode,
      title: `Episode ${episodeInfo.episode}`,
      seasonId: season.id,

      mediaSource: {
        create: createMediaSourceData(media),
      },
    },
  });

  result.added++;
}

/**
 * Find an existing MediaSource using the correct
 * identity for the source type.
 */
async function findExistingSource(
  media: ScanMedia,
) {
  /*
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

  /*
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
 * Create the Prisma MediaSource data for a scanned item.
 */
function createMediaSourceData(
  media: ScanMedia,
) {
  /*
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

  /*
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
 * Update the MediaSource information.
 */
async function updateMediaSource(
  sourceId: string,
  media: ScanMedia,
) {
  /*
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

  /*
   * ZIP/archive entry.
   */
  if (!media.archivePath || !media.entryPath) {
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
 * Human-readable path for scanner errors.
 */
function getMediaDisplayPath(
  media: ScanMedia,
): string {
  if (media.sourceType === "FILE") {
    return media.filePath ?? media.filename;
  }

  return [
    media.archivePath,
    media.entryPath,
  ]
    .filter(Boolean)
    .join("::");
}

