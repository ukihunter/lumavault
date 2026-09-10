import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/db/prisma";

import {
 downloadEpisodeSubtitle,
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

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { episodeId } = await params;

    const body = await request.json();

    const fileUrl =
      typeof body.fileUrl === "string"
        ? body.fileUrl.trim()
        : "";

    const language =
      typeof body.language === "string"
        ? body.language.toLowerCase()
        : "";

    if (!fileUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Subtitle URL is required.",
        },
        { status: 400 },
      );
    }

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

    const subtitle =
      await downloadEpisodeSubtitle(
        episodeId,
        fileUrl,
        language,
      );

    return NextResponse.json({
      success: true,
      subtitle: {
        language: subtitle.language,

        label:
          language === "en"
            ? "English"
            : "Sinhala",

        src: subtitle.src,
      },
    });
  } catch (error) {
    console.error(
      "POST /api/subtitles/episodes/[episodeId]/download failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to download subtitle.",
      },
      { status: 500 },
    );
  }
}