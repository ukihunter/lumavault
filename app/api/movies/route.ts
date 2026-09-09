import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const movies = await prisma.movie.findMany({
      orderBy: {
        title: "asc",
      },
      include: {
        mediaSource: true,
      },
    });

    return NextResponse.json({
      success: true,
      movies,
    });
  } catch (error) {
    console.error("GET /api/movies error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load movies",
      },
      { status: 500 },
    );
  }
}