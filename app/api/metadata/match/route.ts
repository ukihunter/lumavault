import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import {
  matchMovie,
  matchSeries,
} from "@/lib/metadata/match";

export async function POST(
  request: NextRequest,
) {
  try {
    const body = await request.json();

    const {
      type,
      id,
    }: {
      type?: "movie" | "series";
      id?: string;
    } = body;

    if (!type || !id) {
      return NextResponse.json(
        {
          success: false,
          error: "type and id are required",
        },
        { status: 400 },
      );
    }

    if (type === "movie") {
      const movie = await prisma.movie.findUnique({
        where: { id },
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

      const metadata = await matchMovie(
        movie.title,
        movie.year,
      );

      if (!metadata) {
        return NextResponse.json({
          success: false,
          matched: false,
          error: "No TMDB match found",
        });
      }

      const updated = await prisma.movie.update({
        where: { id: movie.id },
        data: {
          tmdbId: metadata.tmdbId,
          overview: metadata.overview,
          poster: metadata.poster,
          backdrop: metadata.backdrop,
          voteAverage: metadata.voteAverage,
        },
      });

      return NextResponse.json({
        success: true,
        matched: true,
        score: metadata.score,
        movie: updated,
      });
    }

    const series = await prisma.series.findUnique({
      where: { id },
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

    const metadata = await matchSeries(
      series.title,
      series.year,
    );

    if (!metadata) {
      return NextResponse.json({
        success: false,
        matched: false,
        error: "No TMDB match found",
      });
    }

    const updated = await prisma.series.update({
      where: { id: series.id },
      data: {
        tmdbId: metadata.tmdbId,
        overview: metadata.overview,
        poster: metadata.poster,
        backdrop: metadata.backdrop,
        voteAverage: metadata.voteAverage,
      },
    });

    return NextResponse.json({
      success: true,
      matched: true,
      score: metadata.score,
      series: updated,
    });
  } catch (error) {
    console.error(
      "POST /api/metadata/match:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to match metadata",
      },
      { status: 500 },
    );
  }
}