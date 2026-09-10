import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

import {
 searchEpisodeSubtitles,
  type SubtitleLanguage,
} from "@/lib/subtitles/subdl";

type RouteContext = {
  params: Promise<{
    episodeId: string;
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
    const { episodeId } = await params;

    const language =
      request.nextUrl.searchParams.get(
        "language",
      ) ?? "en";

    if (!isLanguage(language)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported subtitle language.",
        },
        { status: 400 },
      );
    }

    const episode =
      await prisma.episode.findUnique({
        where: {
          id: episodeId,
        },
        select: {
          id: true,
          number: true,
          season: {
            select: {
              number: true,
              series: {
                select: {
                  title: true,
                  year: true,
                  tmdbId: true,
                },
              },
            },
          },
        },
      });

    if (!episode) {
      return NextResponse.json(
        {
          success: false,
          error: "Episode not found.",
        },
        { status: 404 },
      );
    }

    const series = episode.season.series;

    if (!series.tmdbId) {
      return NextResponse.json({
        success: true,
        subtitles: [],
      });
    }

    const results =
      await searchEpisodeSubtitles(
        series.tmdbId,
        episode.season.number,
        episode.number,
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
      "GET /api/subtitles/episodes/[episodeId] failed:",
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