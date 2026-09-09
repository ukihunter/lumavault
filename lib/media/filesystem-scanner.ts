import { readdir } from "node:fs/promises";
import path from "node:path";
import type { ScanMedia } from "./types";

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

function isVideoFile(filePath: string): boolean {
  return VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export async function collectFilesystemMedia(
  directory: string,
  rootDirectory: string,
): Promise<ScanMedia[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const media: ScanMedia[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      const nested = await collectFilesystemMedia(
        fullPath,
        rootDirectory,
      );

      media.push(...nested);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!isVideoFile(fullPath)) {
      continue;
    }

    media.push({
      sourceType: "FILE",
      filePath: fullPath,
      relativePath: path.relative(rootDirectory, fullPath),
      filename: entry.name,
    });
  }

  return media;
}