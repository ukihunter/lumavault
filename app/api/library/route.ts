import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { existsSync, statSync } from "node:fs";
import { normalizeWindowsPath } from "@/lib/filesystem/windows-path";

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

    const rawPath =
      typeof body.path === "string"
        ? body.path.trim()
        : "";

    const type =
      typeof body.type === "string"
        ? body.type.toUpperCase()
        : "";

    /*
     * Validate library name.
     */
    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Library name is required",
        },
        { status: 400 },
      );
    }

    /*
     * Validate library path.
     */
    if (!rawPath) {
      return NextResponse.json(
        {
          success: false,
          error: "Library path is required",
        },
        { status: 400 },
      );
    }

    /*
     * Validate library type.
     */
    if (!LIBRARY_TYPES.includes(type as LibraryType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Library type must be MOVIES or SERIES",
        },
        { status: 400 },
      );
    }

    /*
     * Convert Windows paths to the Linux filesystem path.
     *
     * Example:
     *
     * D:\Games\Ben 10
     *
     * becomes:
     *
     * /run/media/uki/166469196468FCBD/Games/Ben 10
     *
     * Linux paths are returned unchanged.
     */
    let libraryPath: string;

    try {
      libraryPath = normalizeWindowsPath(rawPath);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Invalid library path",
        },
        { status: 400 },
      );
    }

    /*
     * Make sure the converted path is not empty.
     */
    if (!libraryPath) {
      return NextResponse.json(
        {
          success: false,
          error: "Library path is invalid",
        },
        { status: 400 },
      );
    }

    /*
     * Make sure the converted path exists.
     *
     * IMPORTANT:
     *
     * We check libraryPath, NOT rawPath.
     *
     * rawPath could be:
     *
     * D:\Games\Ben 10
     *
     * while libraryPath is:
     *
     * /run/media/uki/166469196468FCBD/Games/Ben 10
     */
    if (!existsSync(libraryPath)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected directory does not exist on the LumaVault server.",
        },
        { status: 400 },
      );
    }

    /*
     * Make sure the converted path is actually
     * a directory.
     */
    let stats;

    try {
      stats = statSync(libraryPath);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to access the selected directory.",
        },
        { status: 400 },
      );
    }

    if (!stats.isDirectory()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected path is not a directory.",
        },
        { status: 400 },
      );
    }

    /*
     * Prevent duplicate library paths.
     *
     * We use the normalized Linux path because that is
     * what is stored in the database.
     */
    const existingLibrary =
      await prisma.library.findUnique({
        where: {
          path: libraryPath,
        },
      });

    if (existingLibrary) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A library already exists for this directory.",
        },
        { status: 409 },
      );
    }

    /*
     * Create the library.
     *
     * Prisma stores the Linux path, not the Windows path.
     */
    const library = await prisma.library.create({
      data: {
        name,
        path: libraryPath,
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

    /*
     * Return the library.
     *
     * `path` will contain the normalized Linux path.
     */
    return NextResponse.json(
      {
        success: true,
        library,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/library error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create library",
      },
      { status: 500 },
    );
  }
}