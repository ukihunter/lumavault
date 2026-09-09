import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const episodeId = request.nextUrl.searchParams.get("episodeId");

    // Get a specific episode's progress
    if (episodeId) {
      const progress = await prisma.progress.findUnique({
        where: {
          episodeId,
        },
      });

      return NextResponse.json({
        success: true,
        progress,
      });
    }

    // Get all unfinished progress
    const progress = await prisma.progress.findMany({
      where: {
        completed: false,
        position: {
          gt: 0,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        episode: {
          select: {
            id: true,
            number: true,
            title: true,
            duration: true,
            thumbnail: true,
            season: {
              select: {
                number: true,
                series: {
                  select: {
                    id: true,
                    title: true,
                    poster: true,
                    backdrop: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      progress,
      count: progress.length,
    });
  } catch (error) {
    console.error("GET /api/progress error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load progress",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const episodeId = String(body.episodeId ?? "");
    const position = Number(body.position ?? 0);
    const completed = Boolean(body.completed ?? false);

    if (!episodeId) {
      return NextResponse.json(
        {
          success: false,
          error: "episodeId is required",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(position) || position < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid position",
        },
        {
          status: 400,
        },
      );
    }

    const progress = await prisma.progress.upsert({
      where: {
        episodeId,
      },
      create: {
        episodeId,
        position: Math.floor(position),
        completed,
      },
      update: {
        position: Math.floor(position),
        completed,
      },
    });

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error("POST /api/progress error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save progress",
      },
      {
        status: 500,
      },
    );
  }
}