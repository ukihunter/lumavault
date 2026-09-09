
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

import {
  searchMovieSubtitles,
  type SubtitleLanguage,
} from "@/lib/subtitles/subdl";

type RouteContext = {
  params: Promise<{
    movieId: string;
  }>;
};

function isLanguage(
  value: string,
): value is SubtitleLanguage {
  return value === "en" || value === "si";
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { movieId } = await params;

    const language =
      request.nextUrl.searchParams.get(
        "language",
      ) ?? "en";

    if (!isLanguage(language)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported subtitle language.",
        },
        { status: 400 },
      );
    }

    const movie =
      await prisma.movie.findUnique({
        where: {
          id: movieId,
        },
        select: {
          id: true,
          title: true,
          tmdbId: true,
        },
      });

    if (!movie) {
      return NextResponse.json(
        {
          success: false,
          error: "Movie not found.",
        },
        { status: 404 },
      );
    }

    if (!movie.tmdbId) {
      return NextResponse.json({
        success: true,
        subtitles: [],
      });
    }

    const results =
      await searchMovieSubtitles(
        movie.tmdbId,
        language,
      );

    return NextResponse.json({
      success: true,
      subtitles: results.map(
        (subtitle) => ({
          fileId: subtitle.fileId,
          language:
            subtitle.languageCode,

          label:
            subtitle.languageCode === "en"
              ? "English"
              : subtitle.languageCode === "si"
                ? "Sinhala"
                : subtitle.language,

          release: subtitle.release,

          downloadCount:
            subtitle.downloads,

          hearingImpaired:
            subtitle.hearingImpaired,

          fileName:
            subtitle.fileName,

          // Required by the download route.
          url: subtitle.url,
        }),
      ),
    });
  } catch (error) {
    console.error(
      "GET /api/subtitles/movies/[movieId] failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to search subtitles.",
      },
      { status: 500 },
    );
  }
}

