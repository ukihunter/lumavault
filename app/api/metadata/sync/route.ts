
import { NextRequest, NextResponse } from "next/server";

import { syncMetadata } from "@/lib/metadata/sync";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    let body: {
      force?: boolean;
      syncEpisodes?: boolean;
    } = {};

    try {
      body = await request.json();
    } catch {
      // Empty body is allowed.
    }

    const result = await syncMetadata({
      force: body.force === true,
      syncEpisodes: body.syncEpisodes !== false,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("POST /api/metadata/sync failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Metadata synchronization failed",
      },
      { status: 500 },
    );
  }
}

