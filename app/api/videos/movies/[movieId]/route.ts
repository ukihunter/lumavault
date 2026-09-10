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

/* -------------------------------------------------------------------------- */
/* MIME type                                                                  */
/* -------------------------------------------------------------------------- */

function getMimeType(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();

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
    case ".m2ts":
      return "video/mp2t";

    default:
      return "application/octet-stream";
  }
}

/* -------------------------------------------------------------------------- */
/* Range parsing                                                              */
/* -------------------------------------------------------------------------- */

function parseRange(
  rangeHeader: string | null,
  size: number,
): ByteRange | null {
  if (!rangeHeader) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());

  if (!match) {
    return null;
  }

  const startText = match[1];
  const endText = match[2];

  let start: number;
  let end: number;

  /*
   * Suffix range:
   *
   * bytes=-500
   *
   * Means the last 500 bytes.
   */
  if (startText === "") {
    const suffixLength = Number(endText);

    if (
      !Number.isSafeInteger(suffixLength) ||
      suffixLength <= 0
    ) {
      return null;
    }

    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(startText);

    if (
      !Number.isSafeInteger(start) ||
      start < 0
    ) {
      return null;
    }

    /*
     * Open-ended range:
     *
     * bytes=500-
     */
    if (endText === "") {
      end = size - 1;
    } else {
      end = Number(endText);

      if (
        !Number.isSafeInteger(end) ||
        end < start
      ) {
        return null;
      }

      end = Math.min(end, size - 1);
    }
  }

  if (
    start >= size ||
    start > end
  ) {
    return null;
  }

  return {
    start,
    end,
  };
}

/* -------------------------------------------------------------------------- */
/* ZIP helpers                                                                */
/* -------------------------------------------------------------------------- */

function openZip(
  archivePath: string,
): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
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
              new Error("Failed to open archive"),
          );
          return;
        }

        resolve(zipFile);
      },
    );
  });
}

async function findZipEntry(
  archivePath: string,
  entryPath: string,
): Promise<{
  zipFile: yauzl.ZipFile;
  entry: yauzl.Entry;
}> {
  const zipFile = await openZip(archivePath);

  return new Promise((resolve, reject) => {
    let finished = false;

    const cleanup = () => {
      zipFile.removeAllListeners("entry");
      zipFile.removeAllListeners("error");
      zipFile.removeAllListeners("end");
    };

    zipFile.on("entry", (entry) => {
      if (finished) {
        return;
      }

      if (entry.fileName === entryPath) {
        finished = true;

        cleanup();

        resolve({
          zipFile,
          entry,
        });

        return;
      }

      zipFile.readEntry();
    });

    zipFile.on("error", (error) => {
      if (finished) {
        return;
      }

      finished = true;

      cleanup();

      try {
        zipFile.close();
      } catch {
        // Ignore cleanup errors.
      }

      reject(error);
    });

    zipFile.on("end", () => {
      if (finished) {
        return;
      }

      finished = true;

      cleanup();

      try {
        zipFile.close();
      } catch {
        // Ignore cleanup errors.
      }

      reject(
        new Error(
          `Archive entry not found: ${entryPath}`,
        ),
      );
    });

    zipFile.readEntry();
  });
}

/* -------------------------------------------------------------------------- */
/* ZIP stream                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Creates a stream for an uncompressed byte range inside a ZIP entry.
 *
 * IMPORTANT:
 *
 * HTTP byte ranges refer to the UNCOMPRESSED video file.
 *
 * We therefore cannot pass HTTP start/end directly into yauzl for
 * compressed ZIP entries.
 *
 * Instead:
 *
 *   1. Open the ZIP entry normally.
 *   2. yauzl decompresses the entry as a stream.
 *   3. Skip `start` bytes.
 *   4. Return exactly `end - start + 1` bytes.
 *   5. Destroy the source stream once the requested range is complete.
 *
 * This keeps memory usage low and makes the HTTP response correct.
 */
async function createZipStream(
  archivePath: string,
  entryPath: string,
  start: number,
  end: number,
): Promise<Readable> {
  const {
    zipFile,
    entry,
  } = await findZipEntry(
    archivePath,
    entryPath,
  );

  const requestedLength =
    end - start + 1;

  let sourceStream: NodeJS.ReadableStream | null =
    null;

  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;

    try {
      if (
        sourceStream &&
        "destroy" in sourceStream &&
        typeof sourceStream.destroy === "function"
      ) {
        sourceStream.destroy();
      }
    } catch {
      // Ignore cleanup errors.
    }

    try {
      zipFile.close();
    } catch {
      // Ignore cleanup errors.
    }
  };

  try {
    sourceStream = await new Promise<NodeJS.ReadableStream>(
      (resolve, reject) => {
        zipFile.openReadStream(
          entry,
          (error, readStream) => {
            if (error || !readStream) {
              reject(
                error ??
                  new Error(
                    "Failed to open ZIP entry stream",
                  ),
              );

              return;
            }

            resolve(readStream);
          },
        );
      },
    );
  } catch (error) {
    cleanup();
    throw error;
  }

  let bytesToSkip = start;
  let bytesToSend = requestedLength;
  let rangeFinished = false;

  const limitedStream = new Transform({
    transform(chunk, _encoding, callback) {
      try {
        if (rangeFinished) {
          callback();
          return;
        }

        let buffer: Buffer;

        if (Buffer.isBuffer(chunk)) {
          buffer = chunk;
        } else if (chunk instanceof Uint8Array) {
          buffer = Buffer.from(chunk);
        } else {
          buffer = Buffer.from(String(chunk));
        }

        /*
         * First discard bytes until we reach the requested
         * uncompressed starting position.
         */
        if (bytesToSkip > 0) {
          const skipAmount = Math.min(
            bytesToSkip,
            buffer.length,
          );

          bytesToSkip -= skipAmount;

          buffer = buffer.subarray(skipAmount);
        }

        /*
         * Nothing remains from this chunk after skipping.
         */
        if (
          buffer.length === 0 ||
          bytesToSend <= 0
        ) {
          callback();
          return;
        }

        /*
         * Only return the exact number of bytes requested.
         */
        const outputLength = Math.min(
          bytesToSend,
          buffer.length,
        );

        const output =
          buffer.subarray(
            0,
            outputLength,
          );

        bytesToSend -= outputLength;

        /*
         * This is the final requested chunk.
         */
        if (bytesToSend === 0) {
          rangeFinished = true;

          /*
           * We must call callback with the final data first.
           *
           * Then destroy the source stream on the next
           * turn so the final chunk is not lost.
           */
          callback(null, output);

          setImmediate(() => {
            cleanup();
          });

          return;
        }

        callback(null, output);
      } catch (error) {
        callback(
          error instanceof Error
            ? error
            : new Error(
                "Failed to process ZIP stream",
              ),
        );
      }
    },

    flush(callback) {
      cleanup();
      callback();
    },
  });

  /*
   * Propagate source errors to the HTTP stream.
   */
  sourceStream.on(
    "error",
    (error) => {
      if (!rangeFinished) {
        limitedStream.destroy(error);
      } else {
        cleanup();
      }
    },
  );

  /*
   * If the source naturally ends before the requested
   * range has been completely delivered, close everything.
   */
  sourceStream.on(
    "end",
    () => {
      cleanup();
    },
  );

  /*
   * If the transform is destroyed for any reason,
   * make sure the ZIP file is also closed.
   */
  limitedStream.on(
    "close",
    () => {
      cleanup();
    },
  );

  limitedStream.on(
    "error",
    () => {
      cleanup();
    },
  );

  sourceStream.pipe(limitedStream);

  return limitedStream;
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const {
      movieId,
    } = await params;

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

    /* ---------------------------------------------------------------------- */
    /* Movie not found                                                        */
    /* ---------------------------------------------------------------------- */

    if (!movie) {
      return NextResponse.json(
        {
          success: false,
          error: "Movie not found",
        },
        {
          status: 404,
        },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* No media source                                                        */
    /* ---------------------------------------------------------------------- */

    if (!movie.mediaSource) {
      return NextResponse.json(
        {
          success: false,
          error: "Movie has no media source",
        },
        {
          status: 404,
        },
      );
    }

    const source =
      movie.mediaSource;

    const rangeHeader =
      request.headers.get("range");

    /* ====================================================================== */
    /* NORMAL FILE                                                            */
    /* ====================================================================== */

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
            error: "Movie file not found",
          },
          {
            status: 404,
          },
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
          rangeHeader,
          size,
        );

      /* -------------------------------------------------------------------- */
      /* Invalid range                                                        */
      /* -------------------------------------------------------------------- */

      if (
        rangeHeader &&
        !range
      ) {
        return new NextResponse(
          null,
          {
            status: 416,

            headers: {
              "Content-Range":
                `bytes */${size}`,

              "Accept-Ranges":
                "bytes",
            },
          },
        );
      }

      /* -------------------------------------------------------------------- */
      /* No range                                                             */
      /* -------------------------------------------------------------------- */

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

              "Content-Disposition":
                "inline",
            },
          },
        );
      }

      /* -------------------------------------------------------------------- */
      /* Range                                                                */
      /* -------------------------------------------------------------------- */

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
              String(contentLength),

            "Content-Range":
              `bytes ${start}-${end}/${size}`,

            "Accept-Ranges":
              "bytes",

            "Cache-Control":
              "no-store",

            "Content-Disposition":
              "inline",
          },
        },
      );
    }

    /* ====================================================================== */
    /* ZIP ARCHIVE                                                            */
    /* ====================================================================== */

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
            error: "Movie archive not found",
          },
          {
            status: 404,
          },
        );
      }

      /*
       * Find the ZIP entry only to obtain its metadata,
       * especially the uncompressed video size.
       */
      const {
        zipFile,
        entry,
      } =
        await findZipEntry(
          source.archivePath,
          source.entryPath,
        );

      const size =
        entry.uncompressedSize;

      const mimeType =
        getMimeType(
          source.entryPath,
        );

      /*
       * We only needed this ZIP handle for metadata.
       */
      try {
        zipFile.close();
      } catch {
        // Ignore cleanup errors.
      }

      const range =
        parseRange(
          rangeHeader,
          size,
        );

      /* -------------------------------------------------------------------- */
      /* Invalid range                                                        */
      /* -------------------------------------------------------------------- */

      if (
        rangeHeader &&
        !range
      ) {
        return new NextResponse(
          null,
          {
            status: 416,

            headers: {
              "Content-Range":
                `bytes */${size}`,

              "Accept-Ranges":
                "bytes",
            },
          },
        );
      }

      /* -------------------------------------------------------------------- */
      /* No range                                                             */
      /* -------------------------------------------------------------------- */

      if (!range) {
        const stream =
          await createZipStream(
            source.archivePath,
            source.entryPath,
            0,
            size - 1,
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

              "Content-Disposition":
                "inline",
            },
          },
        );
      }

      /* -------------------------------------------------------------------- */
      /* Range                                                                */
      /* -------------------------------------------------------------------- */

      const {
        start,
        end,
      } = range;

      const contentLength =
        end - start + 1;

      /*
       * IMPORTANT:
       *
       * Do NOT pass start/end directly to yauzl.
       *
       * For compressed ZIP entries, those values are not
       * uncompressed HTTP byte offsets.
       *
       * createZipStream() handles the range by streaming
       * decompressed data and limiting the output.
       */
      const stream =
        await createZipStream(
          source.archivePath,
          source.entryPath,
          start,
          end,
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
              String(contentLength),

            "Content-Range":
              `bytes ${start}-${end}/${size}`,

            "Accept-Ranges":
              "bytes",

            "Cache-Control":
              "no-store",

            "Content-Disposition":
              "inline",
          },
        },
      );
    }

    /* ====================================================================== */
    /* UNSUPPORTED                                                            */
    /* ====================================================================== */

    return NextResponse.json(
      {
        success: false,
        error:
          "Unsupported movie media source",
      },
      {
        status: 400,
      },
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
      {
        status: 500,
      },
    );
  }
}