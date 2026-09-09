import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (!query) {
      return NextResponse.json({
        success: true,
        movies: [],
        series: [],
      });
    }

    const [movies, series] = await Promise.all([
      prisma.movie.findMany({
        where: {
          title: {
            contains: query,
          },
        },
        orderBy: {
          title: "asc",
        },
        take: 50,
      }),

      prisma.series.findMany({
        where: {
          title: {
            contains: query,
          },
        },
        orderBy: {
          title: "asc",
        },
        take: 50,
      }),
    ]);

    return NextResponse.json({
      success: true,
      query,
      movies,
      series,
    });
  } catch (error) {
    console.error("GET /api/search error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Search failed",
      },
      { status: 500 },
    );
  }
}