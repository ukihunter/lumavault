import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{
    libraryId: string;
  }>;
};

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const { libraryId } = await params;

    const library = await prisma.library.findUnique({
      where: {
        id: libraryId,
      },
    });

    if (!library) {
      return NextResponse.json(
        {
          success: false,
          error: "Library not found",
        },
        { status: 404 },
      );
    }

    await prisma.library.delete({
      where: {
        id: libraryId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Library deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE /api/library/[libraryId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete library",
      },
      { status: 500 },
    );
  }
}