import { NextRequest, NextResponse } from "next/server";
import { realpath, readdir, stat } from "node:fs/promises";
import path from "node:path";

const DEFAULT_BROWSE_ROOTS = [
  "/home",
  "/mnt",
  "/media",
  "/srv",
];

function getBrowseRoots() {
  const configured = process.env.LUMAVAULT_BROWSE_ROOTS;

  if (!configured) {
    return DEFAULT_BROWSE_ROOTS;
  }

  return configured
    .split(",")
    .map((root) => root.trim())
    .filter(Boolean);
}

async function resolveExistingPath(inputPath: string) {
  const resolved = await realpath(inputPath);
  return path.normalize(resolved);
}

function isPathInsideRoot(targetPath: string, rootPath: string) {
  const relative = path.relative(rootPath, targetPath);

  return (
    relative === "" ||
    (!relative.startsWith("..") &&
      !path.isAbsolute(relative))
  );
}

async function getSafeRoots() {
  const roots = getBrowseRoots();
  const safeRoots: string[] = [];

  for (const root of roots) {
    try {
      const resolvedRoot = await resolveExistingPath(root);

      const rootStats = await stat(resolvedRoot);

      if (rootStats.isDirectory()) {
        safeRoots.push(resolvedRoot);
      }
    } catch {
      // Ignore roots that don't exist or aren't accessible.
    }
  }

  return safeRoots;
}

async function isAllowedPath(targetPath: string) {
  const roots = await getSafeRoots();

  return roots.some((root) =>
    isPathInsideRoot(targetPath, root),
  );
}

export async function GET(request: NextRequest) {
  try {
    const requestedPath =
      request.nextUrl.searchParams.get("path");

    const roots = await getSafeRoots();

    if (roots.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No filesystem browse roots are available.",
        },
        { status: 500 },
      );
    }

    let currentPath: string;

    if (!requestedPath) {
      currentPath = roots[0];
    } else {
      try {
        currentPath = await resolveExistingPath(requestedPath);
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: "Directory does not exist.",
          },
          { status: 404 },
        );
      }
    }

    const currentStats = await stat(currentPath);

    if (!currentStats.isDirectory()) {
      return NextResponse.json(
        {
          success: false,
          error: "The selected path is not a directory.",
        },
        { status: 400 },
      );
    }

    if (!(await isAllowedPath(currentPath))) {
      return NextResponse.json(
        {
          success: false,
          error: "Access to this directory is not allowed.",
        },
        { status: 403 },
      );
    }

    const entries = await readdir(currentPath, {
      withFileTypes: true,
    });

    const directories = [];

    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }

      const entryPath = path.join(
        currentPath,
        entry.name,
      );

      try {
        const resolvedEntryPath =
          await resolveExistingPath(entryPath);

        const entryStats = await stat(resolvedEntryPath);

        if (!entryStats.isDirectory()) {
          continue;
        }

        if (
          !(await isAllowedPath(resolvedEntryPath))
        ) {
          continue;
        }

        directories.push({
          name: entry.name,
          path: resolvedEntryPath,
        });
      } catch {
        // Ignore inaccessible directories.
      }
    }

    directories.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      }),
    );

    const parentPath = path.dirname(currentPath);

    const canGoParent =
      parentPath !== currentPath &&
      (await isAllowedPath(parentPath));

    return NextResponse.json({
      success: true,
      currentPath,
      parentPath: canGoParent ? parentPath : null,
      directories,
      roots,
    });
  } catch (error) {
    console.error(
      "GET /api/filesystem/directories error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to browse directories.",
      },
      { status: 500 },
    );
  }
}