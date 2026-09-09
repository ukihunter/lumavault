import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{
    seriesId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const { seriesId } = await params;

    const series = await prisma.series.findUnique({
      where: {
        id: seriesId,
      },
      include: {
        library: true,
        seasons: {
          orderBy: {
            number: "asc",
          },
          include: {
            episodes: {
              orderBy: {
                number: "asc",
              },
              include: {
                mediaSource: true,
              },
            },
          },
        },
      },
    });

    if (!series) {
      return NextResponse.json(
        {
          success: false,
          error: "Series not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      series,
    });
  } catch (error) {
    console.error(
      "GET /api/series/[seriesId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load series",
      },
      { status: 500 },
    );
  }
}