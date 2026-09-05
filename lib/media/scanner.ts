import { readdir } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mkv",
  ".webm",
  ".avi",
  ".mov",
  ".m4v",
  ".wmv",
  ".flv",
  ".ts",
  ".m2ts",
]);

export type ScanResult = {
  libraryId: string;
  libraryName: string;
  scannedFiles: number;
  added: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
};

type ScanFile = {
  filePath: string;
  relativePath: string;
};

type EpisodeInfo = {
  season: number;
  episode: number;
};

function isVideoFile(filePath: string): boolean {
  return VIDEO_EXTENSIONS.has(
    path.extname(filePath).toLowerCase(),
  );
}

async function collectVideoFiles(
  directory: string,
  rootDirectory: string,
): Promise<ScanFile[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const files: ScanFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      const nestedFiles = await collectVideoFiles(
        fullPath,
        rootDirectory,
      );

      files.push(...nestedFiles);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!isVideoFile(fullPath)) {
      continue;
    }

    files.push({
      filePath: fullPath,
      relativePath: path.relative(
        rootDirectory,
        fullPath,
      ),
    });
  }

  return files;
}

function parseEpisode(
  filename: string,
): EpisodeInfo | null {
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

function cleanMovieTitle(filename: string): string {
  const withoutExtension = path.basename(
    filename,
    path.extname(filename),
  );

  return withoutExtension
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?1080p.*?\)/gi, "")
    .replace(/\b(2160p|1080p|720p|480p|4k)\b/gi, "")
    .replace(/\b(BluRay|WEB-DL|WEBRip|HDTV|DVDRip)\b/gi, "")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSeriesTitle(
  relativePath: string,
  filename: string,
): string {
  const episode = parseEpisode(filename);

  if (!episode) {
    return cleanMovieTitle(filename);
  }

  const seasonDirectory = path.dirname(
    relativePath,
  );

  const seriesDirectory = path.dirname(
    seasonDirectory,
  );

  const seriesName =
    seriesDirectory === "."
      ? path.basename(
          filename,
          path.extname(filename),
        )
      : path.basename(seriesDirectory);

  return seriesName.trim();
}

function getMovieYear(filename: string): number | null {
  const match = filename.match(
    /\b(19|20)\d{2}\b/,
  );

  return match ? Number(match[0]) : null;
}

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

  const files = await collectVideoFiles(
    library.path,
    library.path,
  );

  const result: ScanResult = {
    libraryId: library.id,
    libraryName: library.name,
    scannedFiles: files.length,
    added: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  for (const file of files) {
    try {
      if (library.type === "MOVIES") {
        const existing = await prisma.movie.findUnique({
          where: {
            filePath: file.filePath,
          },
        });

        const title = cleanMovieTitle(
          file.filePath,
        );

        const year = getMovieYear(
          file.filePath,
        );

        await prisma.movie.upsert({
          where: {
            filePath: file.filePath,
          },
          create: {
            title,
            year,
            filePath: file.filePath,
            libraryId: library.id,
          },
          update: {
            title,
            year,
            libraryId: library.id,
          },
        });

        if (existing) {
          result.updated++;
        } else {
          result.added++;
        }

        continue;
      }

      const episodeInfo = parseEpisode(
        path.basename(file.filePath),
      );

      if (!episodeInfo) {
        result.skipped++;
        continue;
      }

      const seriesTitle = cleanSeriesTitle(
        file.relativePath,
        path.basename(file.filePath),
      );

      let series = await prisma.series.findFirst({
        where: {
          libraryId: library.id,
          title: seriesTitle,
        },
      });

      if (!series) {
        series = await prisma.series.create({
          data: {
            title: seriesTitle,
            libraryId: library.id,
          },
        });
      }

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

      const existingEpisode =
        await prisma.episode.findUnique({
          where: {
            filePath: file.filePath,
          },
        });

      await prisma.episode.upsert({
        where: {
          filePath: file.filePath,
        },
        create: {
          number: episodeInfo.episode,
          title: `Episode ${episodeInfo.episode}`,
          filePath: file.filePath,
          seasonId: season.id,
        },
        update: {
          number: episodeInfo.episode,
          seasonId: season.id,
        },
      });

      if (existingEpisode) {
        result.updated++;
      } else {
        result.added++;
      }
    } catch (error) {
      result.errors++;

      result.errorDetails.push(
        `${file.filePath}: ${
          error instanceof Error
            ? error.message
            : "Unknown error"
        }`,
      );
    }
  }

  return result;
}