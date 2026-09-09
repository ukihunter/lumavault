import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

import {
  matchMovie,
  matchSeries,
} from "@/lib/metadata/match";

const AUTO_MATCH_THRESHOLD = 0.82;

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      await request.json();

    const type = body.type;
    const id = body.id;

    if (
      type !== "movie" &&
      type !== "series"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "type must be movie or series",
        },
        { status: 400 },
      );
    }

    if (
      typeof id !== "string" ||
      !id
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "id is required",
        },
        { status: 400 },
      );
    }

    if (type === "movie") {
      const movie =
        await prisma.movie.findUnique({
          where: {
            id,
          },
          select: {
            id: true,
            title: true,
            year: true,
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

      const match =
        await matchMovie(
          movie.title,
          movie.year,
        );

      if (!match) {
        return NextResponse.json({
          success: true,
          matched: false,
          candidates: [],
        });
      }

      if (
        match.score <
        AUTO_MATCH_THRESHOLD
      ) {
        return NextResponse.json({
          success: true,
          matched: false,
          requiresConfirmation: true,
          match,
        });
      }

      const updated =
        await prisma.movie.update({
          where: {
            id: movie.id,
          },
          data: {
            tmdbId: match.tmdbId,
            title: match.title,
            year: match.year,
            overview: match.overview,
            poster: match.poster,
            backdrop: match.backdrop,
            voteAverage:
              match.voteAverage,
          },
        });

      return NextResponse.json({
        success: true,
        matched: true,
        score: match.score,
        media: updated,
      });
    }

    const series =
      await prisma.series.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          title: true,
          year: true,
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

    const match =
      await matchSeries(
        series.title,
        series.year,
      );

    if (!match) {
      return NextResponse.json({
        success: true,
        matched: false,
        candidates: [],
      });
    }

    if (
      match.score <
      AUTO_MATCH_THRESHOLD
    ) {
      return NextResponse.json({
        success: true,
        matched: false,
        requiresConfirmation: true,
        match,
      });
    }

    const updated =
      await prisma.series.update({
        where: {
          id: series.id,
        },
        data: {
          tmdbId: match.tmdbId,
          title: match.title,
          year: match.year,
          overview: match.overview,
          poster: match.poster,
          backdrop: match.backdrop,
          voteAverage:
            match.voteAverage,
        },
      });

    return NextResponse.json({
      success: true,
      matched: true,
      score: match.score,
      media: updated,
    });
  } catch (error) {
    console.error(
      "TMDB matching failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "TMDB matching failed",
      },
      { status: 500 },
    );
  }
}