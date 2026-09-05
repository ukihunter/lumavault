import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { existsSync, statSync } from "node:fs";

const LIBRARY_TYPES = ["MOVIES", "SERIES"] as const;

type LibraryType = (typeof LIBRARY_TYPES)[number];

export async function GET() {
  try {
    const libraries = await prisma.library.findMany({
      orderBy: {
        createdAt: "asc",
      },
      include: {
        _count: {
          select: {
            movies: true,
            series: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      libraries,
    });
  } catch (error) {
    console.error("GET /api/library error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load libraries",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const path =
      typeof body.path === "string"
        ? body.path.trim()
        : "";

    const type =
      typeof body.type === "string"
        ? body.type.toUpperCase()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Library name is required",
        },
        { status: 400 },
      );
    }

    if (!path) {
      return NextResponse.json(
        {
          success: false,
          error: "Library path is required",
        },
        { status: 400 },
      );
    }

    if (!LIBRARY_TYPES.includes(type as LibraryType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Library type must be MOVIES or SERIES",
        },
        { status: 400 },
      );
    }

    // Make sure the selected path exists.
    if (!existsSync(path)) {
      return NextResponse.json(
        {
          success: false,
          error: "The selected directory does not exist",
        },
        { status: 400 },
      );
    }

    // Make sure the path is actually a directory.
    let stats;

    try {
      stats = statSync(path);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to access the selected directory",
        },
        { status: 400 },
      );
    }

    if (!stats.isDirectory()) {
      return NextResponse.json(
        {
          success: false,
          error: "The selected path is not a directory",
        },
        { status: 400 },
      );
    }

    // Prevent duplicate library paths.
    const existingLibrary = await prisma.library.findUnique({
      where: {
        path,
      },
    });

    if (existingLibrary) {
      return NextResponse.json(
        {
          success: false,
          error: "A library already exists for this directory",
        },
        { status: 409 },
      );
    }

    const library = await prisma.library.create({
      data: {
        name,
        path,
        type: type as LibraryType,
      },
      include: {
        _count: {
          select: {
            movies: true,
            series: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        library,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/library error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create library",
      },
      { status: 500 },
    );
  }
}