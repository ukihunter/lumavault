import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const episodeId =
      request.nextUrl.searchParams.get("episodeId");

    if (!episodeId) {
      return NextResponse.json(
        {
          success: false,
          error: "episodeId is required",
        },
        { status: 400 },
      );
    }

    const progress = await prisma.progress.findUnique({
      where: {
        episodeId,
      },
    });

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error("GET /api/progress error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load progress",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const episodeId =
      typeof body.episodeId === "string"
        ? body.episodeId
        : "";

    const position =
      typeof body.position === "number"
        ? Math.max(0, Math.floor(body.position))
        : 0;

    const completed =
      typeof body.completed === "boolean"
        ? body.completed
        : false;

    if (!episodeId) {
      return NextResponse.json(
        {
          success: false,
          error: "episodeId is required",
        },
        { status: 400 },
      );
    }

    const episode = await prisma.episode.findUnique({
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
          error: "Episode not found",
        },
        { status: 404 },
      );
    }

    const progress = await prisma.progress.upsert({
      where: {
        episodeId,
      },
      update: {
        position,
        completed,
      },
      create: {
        episodeId,
        position,
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
      { status: 500 },
    );
  }
}