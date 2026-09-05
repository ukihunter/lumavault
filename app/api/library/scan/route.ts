import { NextRequest, NextResponse } from "next/server";
import { scanLibrary } from "@/lib/media/scanner";

export async function POST(
  request: NextRequest,
) {
  try {
    const body = await request.json();

    const libraryId =
      typeof body.libraryId === "string"
        ? body.libraryId.trim()
        : "";

    if (!libraryId) {
      return NextResponse.json(
        {
          success: false,
          error: "libraryId is required",
        },
        { status: 400 },
      );
    }

    const result = await scanLibrary(
      libraryId,
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "POST /api/library/scan error:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "Library not found"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Library not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Library scan failed",
      },
      { status: 500 },
    );
  }
}