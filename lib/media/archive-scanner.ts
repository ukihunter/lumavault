import { readdir } from "node:fs/promises";
import path from "node:path";
import yauzl from "yauzl";

import type { ScanMedia } from "./types";

const ARCHIVE_EXTENSIONS = new Set([
  ".zip",
]);

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

function isArchiveFile(filePath: string): boolean {
  return ARCHIVE_EXTENSIONS.has(
    path.extname(filePath).toLowerCase(),
  );
}

function isVideoFile(filePath: string): boolean {
  return VIDEO_EXTENSIONS.has(
    path.extname(filePath).toLowerCase(),
  );
}

/**
 * Represents a ZIP archive found on the filesystem.
 */
export type ArchiveFile = {
  archivePath: string;
  relativePath: string;
};

/**
 * Recursively find ZIP archives inside a directory.
 *
 * This only finds archive files.
 * It does not open or extract them.
 */
export async function collectArchiveFiles(
  directory: string,
  rootDirectory: string,
): Promise<ArchiveFile[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const archives: ArchiveFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(
      directory,
      entry.name,
    );

    /*
     * Recursively scan directories.
     */
    if (entry.isDirectory()) {
      const nested = await collectArchiveFiles(
        fullPath,
        rootDirectory,
      );

      archives.push(...nested);
      continue;
    }

    /*
     * Ignore anything that isn't a regular file.
     */
    if (!entry.isFile()) {
      continue;
    }

    /*
     * Only process supported archive formats.
     */
    if (!isArchiveFile(fullPath)) {
      continue;
    }

    archives.push({
      archivePath: fullPath,
      relativePath: path.relative(
        rootDirectory,
        fullPath,
      ),
    });
  }

  return archives;
}

/**
 * Read video entries from a single ZIP archive.
 *
 * IMPORTANT:
 *
 * This does NOT extract the files.
 *
 * yauzl is configured with lazyEntries: true so entries
 * are processed one at a time instead of opening every
 * entry simultaneously.
 */
export function readArchiveMedia(
  archivePath: string,
  archiveRelativePath: string,
): Promise<ScanMedia[]> {
  return new Promise((resolve, reject) => {
    yauzl.open(
      archivePath,
      {
        lazyEntries: true,
        autoClose: true,
        decodeStrings: true,
      },
      (error, zipfile) => {
        if (error || !zipfile) {
          reject(
            error ??
              new Error(
                `Failed to open ZIP archive: ${archivePath}`,
              ),
          );

          return;
        }

        const media: ScanMedia[] = [];

        let finished = false;

        const fail = (err: Error) => {
          if (finished) {
            return;
          }

          finished = true;

          try {
            zipfile.close();
          } catch {
            // Ignore close errors while handling
            // the original error.
          }

          reject(err);
        };

        const finish = () => {
          if (finished) {
            return;
          }

          finished = true;
          resolve(media);
        };

        zipfile.on("error", fail);

        zipfile.on("end", () => {
          finish();
        });

        zipfile.on("entry", (entry) => {
          /*
           * ZIP paths always use forward slashes.
           */
          const entryPath = entry.fileName.replaceAll(
            "\\",
            "/",
          );

          /*
           * Directories inside ZIP files end with "/".
           */
          if (entryPath.endsWith("/")) {
            zipfile.readEntry();
            return;
          }

          /*
           * Only discover supported video files.
           */
          if (!isVideoFile(entryPath)) {
            zipfile.readEntry();
            return;
          }

          const filename = path.posix.basename(
            entryPath,
          );

          media.push({
            sourceType: "ARCHIVE",

            archivePath,

            entryPath,

            relativePath: path.posix.join(
              archiveRelativePath.replaceAll(
                "\\",
                "/",
              ),
              entryPath,
            ),

            filename,
          });

          /*
           * Continue to the next ZIP entry.
           */
          zipfile.readEntry();
        });

        /*
         * Start reading entries.
         */
        zipfile.readEntry();
      },
    );
  });
}

/**
 * Find all video files inside all ZIP archives
 * under the specified library directory.
 *
 * Archives are processed one at a time.
 *
 * No media files are extracted.
 */
export async function collectArchiveMedia(
  directory: string,
  rootDirectory: string,
): Promise<ScanMedia[]> {
  const archives = await collectArchiveFiles(
    directory,
    rootDirectory,
  );

  const media: ScanMedia[] = [];

  for (const archive of archives) {
    try {
      const archiveMedia = await readArchiveMedia(
        archive.archivePath,
        archive.relativePath,
      );

      media.push(...archiveMedia);
    } catch (error) {
      console.error(
        `Failed to scan archive: ${archive.archivePath}`,
        error,
      );
    }
  }

  return media;
}