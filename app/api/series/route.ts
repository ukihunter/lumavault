import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const series = await prisma.series.findMany({
      orderBy: {
        title: "asc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        year: true,
        poster: true,
        backdrop: true,
        voteAverage: true,
        createdAt: true,
        library: {
          select: {
            id: true,
            name: true,
          },
        },

        seasons: {
          orderBy: {
            number: "asc",
          },
          select: {
            id: true,
            number: true,
            title: true,

            _count: {
              select: {
                episodes: true,
              },
            },
          },
        },

      //  createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      series,
      count: series.length,
    });
  } catch (error) {
    console.error("GET /api/series error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load series",
      },
      { status: 500 },
    );
  }
}