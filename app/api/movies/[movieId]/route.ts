import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{
    movieId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const { movieId } = await params;

    const movie = await prisma.movie.findUnique({
      where: {
        id: movieId,
      },
      include: {
        mediaSource: true,
        library: true,
      },
    });

    if (!movie) {
      return NextResponse.json(
        {
          success: false,
          error: "Movie not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      movie,
    });
  } catch (error) {
    console.error(
      "GET /api/movies/[movieId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load movie",
      },
      { status: 500 },
    );
  }
}