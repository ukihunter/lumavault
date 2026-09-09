
import {
  NextResponse,
} from "next/server";

import fs from "node:fs/promises";
import path from "node:path";

type RouteContext = {
  params: Promise<{
    movieId: string;
    language: string;
  }>;
};

const ALLOWED_LANGUAGES =
  new Set([
    "en",
    "si",
  ]);

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const {
      movieId,
      language,
    } = await params;

    if (
      !ALLOWED_LANGUAGES.has(
        language,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported subtitle language",
        },
        { status: 400 },
      );
    }

    /*
     * Prevent path traversal.
     */
    if (
      !/^[a-zA-Z0-9_-]+$/.test(
        movieId,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid movie ID",
        },
        { status: 400 },
      );
    }

    const filePath =
      path.join(
        process.cwd(),
        "data",
        "subtitles",
        "movies",
        movieId,
        `${language}.vtt`,
      );

    try {
      await fs.access(
        filePath,
      );
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Subtitle not found",
        },
        { status: 404 },
      );
    }

    const content =
      await fs.readFile(
        filePath,
        "utf8",
      );

    return new NextResponse(
      content,
      {
        status: 200,

        headers: {
          "Content-Type":
            "text/vtt; charset=utf-8",

          "Cache-Control":
            "public, max-age=31536000, immutable",

          "Content-Length":
            String(
              Buffer.byteLength(
                content,
                "utf8",
              ),
            ),
        },
      },
    );
  } catch (error) {
    console.error(
      "GET subtitle file error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to load subtitle",
      },
      { status: 500 },
    );
  }
}

