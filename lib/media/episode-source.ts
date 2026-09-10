import "server-only";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import { prisma } from "@/lib/db/prisma";

const extractionJobs = new Map<string, Promise<string>>();

function getMediaCacheDirectory() {
  const configured = process.env.LUMAVAULT_CACHE_DIR?.trim();

  if (configured) {
    return path.resolve(configured);
  }

  return path.join(
    process.env.HOME || process.cwd(),
    ".cache",
    "lumavault",
    "media",
  );
}

function hash(value: string) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function runCommand(
  command: string,
  args: string[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} exited with code ${code}: ${stderr.trim()}`,
        ),
      );
    });
  });
}

async function getArchiveCachedFile(
  archivePath: string,
  entryPath: string,
): Promise<string | null> {
  if (!fs.existsSync(archivePath)) {
    return null;
  }

  const stat = await fs.promises.stat(archivePath);

  const cacheKey = hash(
    [
      archivePath,
      entryPath,
      stat.size,
      stat.mtimeMs,
    ].join("|"),
  );

  const cacheDirectory = path.join(
    getMediaCacheDirectory(),
    "archives",
  );

  await fs.promises.mkdir(cacheDirectory, {
    recursive: true,
  });

  /*
   * Preserve the original extension so ffprobe/browser tooling
   * can identify the media correctly.
   */
  const extension =
    path.extname(entryPath) || ".media";

  const outputPath = path.join(
    cacheDirectory,
    `${cacheKey}${extension}`,
  );

  try {
    const cached = await fs.promises.stat(outputPath);

    if (cached.size > 0) {
      return outputPath;
    }
  } catch {
    // Cache does not exist.
  }

  const existingJob = extractionJobs.get(outputPath);

  if (existingJob) {
    return existingJob;
  }

  const temporaryPath = path.join(
    cacheDirectory,
    `${cacheKey}.${process.pid}.${Date.now()}.tmp${extension}`,
  );

  const job = (async () => {
    try {
      await fs.promises.rm(temporaryPath, {
        force: true,
      });

      /*
       * Archive sources currently use ZIP archives.
       *
       * `unzip -p` extracts exactly the requested entry.
       */
      await runCommand("unzip", [
        "-p",
        archivePath,
        entryPath,
      ]).then(async () => {
        /*
         * The command above intentionally isn't used to pipe
         * directly into the file because we want explicit file
         * handling below.
         */
      });

      /*
       * Use unzip directly with stdout redirected by spawning
       * through a custom promise.
       */
      await new Promise<void>((resolve, reject) => {
        const child = spawn(
          "unzip",
          [
            "-p",
            archivePath,
            entryPath,
          ],
          {
            stdio: ["ignore", "pipe", "pipe"],
          },
        );

        const output = fs.createWriteStream(
          temporaryPath,
        );

        let stderr = "";

        child.stderr.on("data", (chunk) => {
          stderr += chunk.toString();
        });

        child.stdout.pipe(output);

        child.on("error", (error) => {
          output.destroy();
          reject(error);
        });

        output.on("error", reject);

        child.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(
              new Error(
                `unzip exited with code ${code}: ${stderr.trim()}`,
              ),
            );
          }
        });
      });

      const extractedStat =
        await fs.promises.stat(temporaryPath);

      if (extractedStat.size <= 0) {
        throw new Error(
          "Archive entry produced an empty media file",
        );
      }

      await fs.promises.rename(
        temporaryPath,
        outputPath,
      );

      console.log(
        `[LumaVault] Archive cache ready: ${outputPath}`,
      );

      return outputPath;
    } catch (error) {
      await fs.promises.rm(temporaryPath, {
        force: true,
      });

      throw error;
    }
  })();

  extractionJobs.set(outputPath, job);

  try {
    return await job;
  } finally {
    extractionJobs.delete(outputPath);
  }
}

export type EpisodeMediaSource = {
  type: "FILE" | "ARCHIVE";
  filePath: string | null;
  archivePath: string | null;
  entryPath: string | null;
};

export async function getEpisodeMediaSource(
  episodeId: string,
): Promise<EpisodeMediaSource | null> {
  const episode = await prisma.episode.findUnique({
    where: {
      id: episodeId,
    },
    select: {
      mediaSource: {
        select: {
          type: true,
          filePath: true,
          archivePath: true,
          entryPath: true,
        },
      },
    },
  });

  if (!episode?.mediaSource) {
    return null;
  }

  return episode.mediaSource;
}

export async function getEpisodePlayableFile(
  episodeId: string,
): Promise<string | null> {
  const source =
    await getEpisodeMediaSource(episodeId);

  if (!source) {
    return null;
  }

  /*
   * Normal FILE source.
   */
  if (
    source.type === "FILE" &&
    source.filePath
  ) {
    if (!fs.existsSync(source.filePath)) {
      return null;
    }

    const stat = await fs.promises.stat(
      source.filePath,
    );

    if (!stat.isFile() || stat.size <= 0) {
      return null;
    }

    return source.filePath;
  }

  /*
   * ARCHIVE source.
   */
  if (
    source.type === "ARCHIVE" &&
    source.archivePath &&
    source.entryPath
  ) {
    return getArchiveCachedFile(
      source.archivePath,
      source.entryPath,
    );
  }

  return null;
}