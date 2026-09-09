import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const movies = await prisma.movie.findMany({
      orderBy: [
        {
          title: "asc",
        },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        year: true,
        poster: true,
        backdrop: true,
        duration: true,

        library: {
          select: {
            id: true,
            name: true,
          },
        },

        mediaSource: {
          select: {
            id: true,
            type: true,
            filePath: true,
            archivePath: true,
            entryPath: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      movies,
      count: movies.length,
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