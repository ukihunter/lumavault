
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";

import yauzl from "yauzl";

import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{
    movieId: string;
  }>;
};

type ByteRange = {
  start: number;
  end: number;
};

function getMimeType(fileName: string): string {
  const extension = path
    .extname(fileName)
    .toLowerCase();

  switch (extension) {
    case ".mp4":
    case ".m4v":
      return "video/mp4";

    case ".webm":
      return "video/webm";

    case ".mkv":
      return "video/x-matroska";

    case ".avi":
      return "video/x-msvideo";

    case ".mov":
      return "video/quicktime";

    case ".wmv":
      return "video/x-ms-wmv";

    case ".flv":
      return "video/x-flv";

    case ".ts":
      return "video/mp2t";

    case ".m2ts":
      return "video/mp2t";

    default:
      return "application/octet-stream";
  }
}

function parseRange(
  rangeHeader: string | null,
  size: number,
): ByteRange | null {
  if (!rangeHeader) {
    return null;
  }

  const match =
    /^bytes=(\d*)-(\d*)$/.exec(
      rangeHeader.trim(),
    );

  if (!match) {
    return null;
  }

  const startText = match[1];
  const endText = match[2];

  let start: number;
  let end: number;

  if (startText === "") {
    const suffixLength = Number(endText);

    if (
      !Number.isFinite(suffixLength) ||
      suffixLength <= 0
    ) {
      return null;
    }

    start = Math.max(
      size - suffixLength,
      0,
    );

    end = size - 1;
  } else {
    start = Number(startText);

    if (!Number.isFinite(start) || start < 0) {
      return null;
    }

    end =
      endText === ""
        ? size - 1
        : Number(endText);

    if (
      !Number.isFinite(end) ||
      end < start
    ) {
      return null;
    }

    end = Math.min(
      end,
      size - 1,
    );
  }

  if (start >= size) {
    return null;
  }

  return {
    start,
    end,
  };
}

function openZip(
  archivePath: string,
): Promise<yauzl.ZipFile> {
  return new Promise(
    (resolve, reject) => {
      yauzl.open(
        archivePath,
        {
          lazyEntries: true,
          autoClose: false,
        },
        (error, zipFile) => {
          if (error || !zipFile) {
            reject(
              error ??
                new Error(
                  "Failed to open archive",
                ),
            );

            return;
          }

          resolve(zipFile);
        },
      );
    },
  );
}

function findZipEntry(
  archivePath: string,
  entryPath: string,
): Promise<{
  zipFile: yauzl.ZipFile;
  entry: yauzl.Entry;
}> {
  return new Promise(
    async (resolve, reject) => {
      let zipFile:
        | yauzl.ZipFile
        | null = null;

      try {
        zipFile =
          await openZip(
            archivePath,
          );

        let found = false;

        zipFile.readEntry();

        zipFile.on(
          "entry",
          (entry) => {
            if (found) {
              return;
            }

            if (
              entry.fileName ===
              entryPath
            ) {
              found = true;

              resolve({
                zipFile,
                entry,
              });

              return;
            }

            zipFile.readEntry();
          },
        );

        zipFile.on(
          "error",
          (error) => {
            if (!found) {
              reject(error);
            }
          },
        );

        zipFile.on(
          "end",
          () => {
            if (!found) {
              reject(
                new Error(
                  `Archive entry not found: ${entryPath}`,
                ),
              );
            }
          },
        );
      } catch (error) {
        if (zipFile) {
          try {
            zipFile.close();
          } catch {
            // Ignore.
          }
        }

        reject(error);
      }
    },
  );
}

async function createZipStream(
  archivePath: string,
  entryPath: string,
  start: number,
) {
  const {
    zipFile,
    entry,
  } = await findZipEntry(
    archivePath,
    entryPath,
  );

  const stream =
    await new Promise<
      NodeJS.ReadableStream
    >((resolve, reject) => {
      zipFile.openReadStream(
        entry,
        (error, readStream) => {
          if (error || !readStream) {
            try {
              zipFile.close();
            } catch {
              // Ignore.
            }

            reject(
              error ??
                new Error(
                  "Failed to open ZIP stream",
                ),
            );

            return;
          }

          resolve(readStream);
        },
      );
    });

  let remaining = start;

  const skipTransform =
    new Transform({
      transform(
        chunk,
        _encoding,
        callback,
      ) {
        if (remaining <= 0) {
          callback(
            null,
            chunk,
          );

          return;
        }

        const buffer =
          Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk);

        if (
          buffer.length <=
          remaining
        ) {
          remaining -=
            buffer.length;

          callback();
          return;
        }

        const output =
          buffer.subarray(
            remaining,
          );

        remaining = 0;

        callback(
          null,
          output,
        );
      },

      flush(callback) {
        try {
          zipFile.close();
        } catch {
          // Ignore.
        }

        callback();
      },
    });

  return Readable
    .from(stream as AsyncIterable<Buffer>)
    .pipe(skipTransform);
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { movieId } =
      await params;

    const movie =
      await prisma.movie.findUnique({
        where: {
          id: movieId,
        },

        select: {
          id: true,
          title: true,

          mediaSource: {
            select: {
              id: true,
              type: true,
              filePath: true,
              archivePath: true,
              entryPath: true,
            },
          },
        },
      });

    if (!movie) {
      return NextResponse.json(
        {
          success: false,
          error: "Movie not found",
        },
        { status: 404 },
      );
    }

    if (!movie.mediaSource) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Movie has no media source",
        },
        { status: 404 },
      );
    }

    const source =
      movie.mediaSource;

    /* ---------------------------------------------------------------------- */
    /* Normal file                                                             */
    /* ---------------------------------------------------------------------- */

    if (
      source.type === "FILE" &&
      source.filePath
    ) {
      if (
        !fs.existsSync(
          source.filePath,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Movie file not found",
          },
          { status: 404 },
        );
      }

      const stat =
        await fs.promises.stat(
          source.filePath,
        );

      const size =
        stat.size;

      const mimeType =
        getMimeType(
          source.filePath,
        );

      const range =
        parseRange(
          request.headers.get(
            "range",
          ),
          size,
        );

      if (
        request.headers.has(
          "range",
        ) &&
        !range
      ) {
        return new NextResponse(
          null,
          {
            status: 416,
            headers: {
              "Content-Range": `bytes */${size}`,
              "Accept-Ranges":
                "bytes",
            },
          },
        );
      }

      if (!range) {
        const stream =
          fs.createReadStream(
            source.filePath,
          );

        return new NextResponse(
          Readable.toWeb(
            stream,
          ) as ReadableStream,
          {
            status: 200,

            headers: {
              "Content-Type":
                mimeType,

              "Content-Length":
                String(size),

              "Accept-Ranges":
                "bytes",

              "Cache-Control":
                "no-store",
            },
          },
        );
      }

      const {
        start,
        end,
      } = range;

      const contentLength =
        end - start + 1;

      const stream =
        fs.createReadStream(
          source.filePath,
          {
            start,
            end,
          },
        );

      return new NextResponse(
        Readable.toWeb(
          stream,
        ) as ReadableStream,
        {
          status: 206,

          headers: {
            "Content-Type":
              mimeType,

            "Content-Length":
              String(
                contentLength,
              ),

            "Content-Range":
              `bytes ${start}-${end}/${size}`,

            "Accept-Ranges":
              "bytes",

            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* ZIP archive                                                             */
    /* ---------------------------------------------------------------------- */

    if (
      source.type === "ARCHIVE" &&
      source.archivePath &&
      source.entryPath
    ) {
      if (
        !fs.existsSync(
          source.archivePath,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Movie archive not found",
          },
          { status: 404 },
        );
      }

      const {
        zipFile,
        entry,
      } = await findZipEntry(
        source.archivePath,
        source.entryPath,
      );

      const size =
        entry.uncompressedSize;

      const mimeType =
        getMimeType(
          source.entryPath,
        );

      const range =
        parseRange(
          request.headers.get(
            "range",
          ),
          size,
        );

      try {
        zipFile.close();
      } catch {
        // Ignore.
      }

      if (
        request.headers.has(
          "range",
        ) &&
        !range
      ) {
        return new NextResponse(
          null,
          {
            status: 416,
            headers: {
              "Content-Range": `bytes */${size}`,
              "Accept-Ranges":
                "bytes",
            },
          },
        );
      }

      if (!range) {
        const stream =
          await createZipStream(
            source.archivePath,
            source.entryPath,
            0,
          );

        return new NextResponse(
          Readable.toWeb(
            stream,
          ) as ReadableStream,
          {
            status: 200,

            headers: {
              "Content-Type":
                mimeType,

              "Content-Length":
                String(size),

              "Accept-Ranges":
                "bytes",

              "Cache-Control":
                "no-store",
            },
          },
        );
      }

      const {
        start,
        end,
      } = range;

      const contentLength =
        end - start + 1;

      const stream =
        await createZipStream(
          source.archivePath,
          source.entryPath,
          start,
        );

      return new NextResponse(
        Readable.toWeb(
          stream,
        ) as ReadableStream,
        {
          status: 206,

          headers: {
            "Content-Type":
              mimeType,

            "Content-Length":
              String(
                contentLength,
              ),

            "Content-Range":
              `bytes ${start}-${end}/${size}`,

            "Accept-Ranges":
              "bytes",

            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Unsupported movie media source",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error(
      "GET /api/videos/movies/[movieId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to stream movie",
      },
      { status: 500 },
    );
  }
}

