import { NextResponse } from "next/server";
import {
  createReadStream,
  statSync,
} from "node:fs";
import { Readable, Transform } from "node:stream";
import path from "node:path";
import yauzl from "yauzl";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{
    episodeId: string;
  }>;
};

function getContentType(filePath: string): string {
  const extension = path
    .extname(filePath)
    .toLowerCase();

  switch (extension) {
    case ".mp4":
      return "video/mp4";

    case ".webm":
      return "video/webm";

    case ".mkv":
      return "video/x-matroska";

    case ".mov":
      return "video/quicktime";

    case ".avi":
      return "video/x-msvideo";

    case ".m4v":
      return "video/x-m4v";

    case ".ts":
      return "video/mp2t";

    case ".m2ts":
      return "video/mp2t";

    case ".wmv":
      return "video/x-ms-wmv";

    case ".flv":
      return "video/x-flv";

    default:
      return "application/octet-stream";
  }
}

function parseRange(
  rangeHeader: string | null,
  fileSize: number,
) {
  if (!rangeHeader) {
    return null;
  }

  const match = rangeHeader.match(
    /^bytes=(\d*)-(\d*)$/,
  );

  if (!match) {
    return {
      invalid: true,
    } as const;
  }

  const startText = match[1];
  const endText = match[2];

  let start: number;
  let end: number;

  // Example:
  // bytes=-500
  if (!startText) {
    const suffixLength = Number(endText);

    if (
      !Number.isFinite(suffixLength) ||
      suffixLength <= 0
    ) {
      return {
        invalid: true,
      } as const;
    }

    start = Math.max(
      fileSize - suffixLength,
      0,
    );

    end = fileSize - 1;
  } else {
    start = Number(startText);

    if (
      !Number.isFinite(start) ||
      start < 0
    ) {
      return {
        invalid: true,
      } as const;
    }

    if (!endText) {
      end = fileSize - 1;
    } else {
      end = Number(endText);
    }
  }

  if (
    start >= fileSize ||
    end < start
  ) {
    return {
      invalid: true,
    } as const;
  }

  end = Math.min(
    end,
    fileSize - 1,
  );

  return {
    invalid: false,
    start,
    end,
    contentLength: end - start + 1,
  } as const;
}

function findZipEntry(
  archivePath: string,
  entryPath: string,
): Promise<{
  zipfile: yauzl.ZipFile;
  entry: yauzl.Entry;
}> {
  return new Promise(
    (resolve, reject) => {
      yauzl.open(
        archivePath,
        {
          lazyEntries: true,
          autoClose: false,
        },
        (error, zipfile) => {
          if (error || !zipfile) {
            reject(
              error ??
                new Error(
                  "Failed to open ZIP archive",
                ),
            );
            return;
          }

          let found = false;

          zipfile.readEntry();

          zipfile.on(
            "entry",
            (entry) => {
              const normalizedEntryPath =
                entry.fileName.replaceAll(
                  "\\",
                  "/",
                );

              if (
                normalizedEntryPath ===
                entryPath.replaceAll("\\", "/")
              ) {
                found = true;

                resolve({
                  zipfile,
                  entry,
                });

                return;
              }

              zipfile.readEntry();
            },
          );

          zipfile.on(
            "end",
            () => {
              if (found) {
                return;
              }

              zipfile.close();

              reject(
                new Error(
                  `ZIP entry not found: ${entryPath}`,
                ),
              );
            },
          );

          zipfile.on(
            "error",
            (zipError) => {
              if (!found) {
                reject(zipError);
              }
            },
          );
        },
      );
    },
  );
}

/**
 * Creates a stream containing only the requested
 * uncompressed byte range from a ZIP entry.
 *
 * ZIP entries using Deflate cannot seek directly
 * inside the uncompressed data, so yauzl must
 * decompress from the beginning.
 */
function createZipRangeStream(
  zipfile: yauzl.ZipFile,
  entry: yauzl.Entry,
  start: number,
  length: number,
): Promise<Readable> {
  return new Promise(
    (resolve, reject) => {
      zipfile.openReadStream(
        entry,
        (error, source) => {
          if (error || !source) {
            zipfile.close();

            reject(
              error ??
                new Error(
                  "Failed to open ZIP entry stream",
                ),
            );

            return;
          }

          let skipped = 0;
          let remaining = length;
          let resolved = false;

          const output = new Transform({
            transform(
              chunk,
              _encoding,
              callback,
            ) {
              const buffer = Buffer.isBuffer(chunk)
                ? chunk
                : Buffer.from(chunk);

              // Skip bytes until we reach
              // the requested starting position.
              if (skipped < start) {
                const bytesToSkip = Math.min(
                  start - skipped,
                  buffer.length,
                );

                skipped += bytesToSkip;

                if (
                  bytesToSkip === buffer.length
                ) {
                  callback();
                  return;
                }

                const remainingBuffer =
                  buffer.subarray(
                    bytesToSkip,
                  );

                if (remaining <= 0) {
                  callback();
                  return;
                }

                const outputLength =
                  Math.min(
                    remaining,
                    remainingBuffer.length,
                  );

                this.push(
                  remainingBuffer.subarray(
                    0,
                    outputLength,
                  ),
                );

                remaining -= outputLength;

                callback();
                return;
              }

              if (remaining <= 0) {
                callback();
                return;
              }

              const outputLength =
                Math.min(
                  remaining,
                  buffer.length,
                );

              this.push(
                buffer.subarray(
                  0,
                  outputLength,
                ),
              );

              remaining -= outputLength;

              if (remaining <= 0) {
                source.destroy();
              }

              callback();
            },
          });

          const cleanup = () => {
            if (!resolved) {
              resolved = true;
              resolve(output);
            }
          };

          source.on(
            "error",
            (streamError) => {
              output.destroy(streamError);
              zipfile.close();

              if (!resolved) {
                resolved = true;
                reject(streamError);
              }
            },
          );

          source.on(
            "end",
            () => {
              zipfile.close();
            },
          );

          output.on(
            "close",
            () => {
              if (!source.destroyed) {
                source.destroy();
              }

              zipfile.close();
            },
          );

          source.pipe(output);

          cleanup();
        },
      );
    },
  );
}

async function streamNormalFile(
  filePath: string,
  request: Request,
) {
  let fileSize: number;

  try {
    fileSize = statSync(filePath).size;
  } catch {
    return new NextResponse(
      "Video file not found",
      {
        status: 404,
      },
    );
  }

  const contentType =
    getContentType(filePath);

  const rangeHeader =
    request.headers.get("range");

  const range = parseRange(
    rangeHeader,
    fileSize,
  );

  if (range?.invalid) {
    return new NextResponse(
      "Requested Range Not Satisfiable",
      {
        status: 416,
        headers: {
          "Content-Range":
            `bytes */${fileSize}`,
        },
      },
    );
  }

  if (!range) {
    const stream =
      createReadStream(filePath);

    return new Response(
      Readable.toWeb(
        stream,
      ) as ReadableStream,
      {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length":
            String(fileSize),
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-cache",
        },
      },
    );
  }

  const stream = createReadStream(
    filePath,
    {
      start: range.start,
      end: range.end,
    },
  );

  return new Response(
    Readable.toWeb(
      stream,
    ) as ReadableStream,
    {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length":
          String(range.contentLength),
        "Content-Range":
          `bytes ${range.start}-${range.end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
      },
    },
  );
}

async function streamZipEntry(
  archivePath: string,
  entryPath: string,
  request: Request,
) {
  const {
    zipfile,
    entry,
  } = await findZipEntry(
    archivePath,
    entryPath,
  );

  const fileSize =
    entry.uncompressedSize;

  const contentType =
    getContentType(entryPath);

  const rangeHeader =
    request.headers.get("range");

  const range = parseRange(
    rangeHeader,
    fileSize,
  );

  if (range?.invalid) {
    zipfile.close();

    return new NextResponse(
      "Requested Range Not Satisfiable",
      {
        status: 416,
        headers: {
          "Content-Range":
            `bytes */${fileSize}`,
        },
      },
    );
  }

  const start =
    range?.start ?? 0;

  const end =
    range?.end ?? fileSize - 1;

  const contentLength =
    end - start + 1;

  const stream =
    await createZipRangeStream(
      zipfile,
      entry,
      start,
      contentLength,
    );

  return new Response(
    Readable.toWeb(
      stream,
    ) as ReadableStream,
    {
      status: range ? 206 : 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length":
          String(contentLength),
        ...(range
          ? {
              "Content-Range":
                `bytes ${start}-${end}/${fileSize}`,
            }
          : {}),
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
      },
    },
  );
}

export async function GET(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { episodeId } =
      await params;

    const episode =
      await prisma.episode.findUnique({
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

    if (!episode) {
      return new NextResponse(
        "Episode not found",
        {
          status: 404,
        },
      );
    }

    const mediaSource =
      episode.mediaSource;

    if (!mediaSource) {
      return new NextResponse(
        "Media source not found",
        {
          status: 404,
        },
      );
    }

    // --------------------------------------------------
    // Normal filesystem video
    // --------------------------------------------------

    if (
      mediaSource.type === "FILE"
    ) {
      if (!mediaSource.filePath) {
        return new NextResponse(
          "Media file path is missing",
          {
            status: 404,
          },
        );
      }

      return streamNormalFile(
        mediaSource.filePath,
        request,
      );
    }

    // --------------------------------------------------
    // ZIP archive video
    // --------------------------------------------------

    if (
      mediaSource.type === "ARCHIVE"
    ) {
      if (
        !mediaSource.archivePath ||
        !mediaSource.entryPath
      ) {
        return new NextResponse(
          "Archive media source is incomplete",
          {
            status: 404,
          },
        );
      }

      return await streamZipEntry(
        mediaSource.archivePath,
        mediaSource.entryPath,
        request,
      );
    }

    return new NextResponse(
      "Unsupported media source type",
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error(
      "GET /api/videos/[episodeId] error:",
      error,
    );

    return new NextResponse(
      "Failed to stream video",
      {
        status: 500,
      },
    );
  }
}