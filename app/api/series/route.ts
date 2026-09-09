import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const series = await prisma.series.findMany({
      orderBy: {
        title: "asc",
      },
      include: {
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

    return NextResponse.json({
      success: true,
      series,
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