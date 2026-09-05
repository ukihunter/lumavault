"use client";

import {
  ChevronLeft,
  Folder,
  FolderOpen,
  FolderPlus,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type LibraryType = "MOVIES" | "SERIES";

type Library = {
  id: string;
  name: string;
  path: string;
  type: LibraryType;
  createdAt: string;
  updatedAt: string;
  _count: {
    movies: number;
    series: number;
  };
};

type LibrariesResponse = {
  success: boolean;
  libraries?: Library[];
  error?: string;
};

type CreateLibraryResponse = {
  success: boolean;
  library?: Library;
  error?: string;
};

type Directory = {
  name: string;
  path: string;
};

type DirectoryResponse = {
  success: boolean;
  currentPath?: string;
  parentPath?: string | null;
  directories?: Directory[];
  error?: string;
};

const EMPTY_FORM = {
  name: "",
  path: "",
  type: "MOVIES" as LibraryType,
};

export default function MediaManager() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  const [showBrowser, setShowBrowser] =
    useState(false);

  const [browserPath, setBrowserPath] = useState("");
  const [parentPath, setParentPath] = useState<
    string | null
  >(null);
  const [directories, setDirectories] = useState<
    Directory[]
  >([]);
  const [loadingDirectories, setLoadingDirectories] =
    useState(false);
  const [browserError, setBrowserError] =
    useState("");

  const loadLibraries = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/library", {
        method: "GET",
        cache: "no-store",
      });

      const data: LibrariesResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to load libraries",
        );
      }

      setLibraries(data.libraries ?? []);
    } catch (error) {
      console.error(
        "Failed to load libraries:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load libraries",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibraries();
  }, [loadLibraries]);

  async function loadDirectories(
    requestedPath?: string,
  ) {
    try {
      setLoadingDirectories(true);
      setBrowserError("");

      const url = requestedPath
        ? `/api/filesystem/directories?path=${encodeURIComponent(
            requestedPath,
          )}`
        : "/api/filesystem/directories";

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      const data: DirectoryResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to load directories",
        );
      }

      setBrowserPath(data.currentPath ?? "");
      setParentPath(data.parentPath ?? null);
      setDirectories(data.directories ?? []);
    } catch (error) {
      console.error(
        "Failed to load directories:",
        error,
      );

      setBrowserError(
        error instanceof Error
          ? error.message
          : "Failed to load directories",
      );
    } finally {
      setLoadingDirectories(false);
    }
  }

  function openBrowser() {
    setBrowserError("");
    setShowBrowser(true);
    loadDirectories();
  }

  function closeBrowser() {
    setShowBrowser(false);
    setBrowserError("");
  }

  function selectDirectory() {
    if (!browserPath) {
      return;
    }

    setForm((current) => ({
      ...current,
      path: browserPath,
    }));

    closeBrowser();
  }

  async function handleCreateLibrary(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Library name is required.");
      return;
    }

    if (!form.path.trim()) {
      setError("Library path is required.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const response = await fetch("/api/library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          path: form.path.trim(),
          type: form.type,
        }),
      });

      const data: CreateLibraryResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to create library",
        );
      }

      if (data.library) {
        setLibraries((current) => [
          ...current,
          data.library!,
        ]);
      }

      setForm(EMPTY_FORM);
      setShowCreateForm(false);
    } catch (error) {
      console.error(
        "Failed to create library:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to create library",
      );
    } finally {
      setCreating(false);
    }
  }

  function getLibraryCount(library: Library) {
    if (library.type === "MOVIES") {
      return `${library._count.movies} ${
        library._count.movies === 1
          ? "movie"
          : "movies"
      }`;
    }

    return `${library._count.series} series`;
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white dark:border-zinc-800/70 dark:bg-zinc-950">
        <div className="flex flex-col gap-4 border-b border-zinc-200/70 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800/70">
          <div>
            <h3 className="font-medium text-zinc-950 dark:text-white">
              Media Libraries
            </h3>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {libraries.length === 0
                ? "No media libraries configured."
                : `${libraries.length} ${
                    libraries.length === 1
                      ? "library"
                      : "libraries"
                  } configured.`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadLibraries}
              disabled={loading}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setShowCreateForm(
                  (current) => !current,
                );
              }}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <Plus className="h-4 w-4" />
              Add Library
            </button>
          </div>
        </div>

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {showCreateForm && (
          <form
            onSubmit={handleCreateLibrary}
            className="border-b border-zinc-200/70 bg-zinc-50/70 p-5 dark:border-zinc-800/70 dark:bg-zinc-900/30"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800">
                <FolderPlus className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-zinc-950 dark:text-white">
                  Add Media Library
                </h4>

                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Select a directory on the LumaVault
                  server.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="library-name"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Name
                </label>

                <input
                  id="library-name"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="My Movies"
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                />
              </div>

              <div>
                <label
                  htmlFor="library-type"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Type
                </label>

                <select
                  id="library-type"
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target
                        .value as LibraryType,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                >
                  <option value="MOVIES">
                    Movies
                  </option>

                  <option value="SERIES">
                    TV Shows
                  </option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="library-path"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Directory
                </label>

                <div className="flex gap-2">
                  <input
                    id="library-path"
                    type="text"
                    value={form.path}
                    readOnly
                    placeholder="Select a directory..."
                    className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />

                  <button
                    type="button"
                    onClick={openBrowser}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Browse
                  </button>
                </div>

                <p className="mt-1.5 text-xs text-zinc-500">
                  Choose a directory from the LumaVault
                  server.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setForm(EMPTY_FORM);
                  setError("");
                }}
                className="h-9 rounded-lg px-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={creating}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {creating && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {creating
                  ? "Adding..."
                  : "Add Library"}
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
          {loading && libraries.length === 0 ? (
            <div className="flex items-center justify-center px-5 py-12">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : libraries.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FolderPlus className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />

              <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                No libraries yet
              </p>

              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                Add your movies or TV show directory to
                get started.
              </p>
            </div>
          ) : (
            libraries.map((library) => (
              <div
                key={library.id}
                className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900">
                      <FolderOpen className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate font-medium text-zinc-950 dark:text-white">
                          {library.name}
                        </h4>

                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                          {library.type ===
                          "MOVIES"
                            ? "Movies"
                            : "TV Shows"}
                        </span>
                      </div>

                      <p className="mt-1 truncate font-mono text-xs text-zinc-500">
                        {library.path}
                      </p>

                      <p className="mt-1 text-xs text-zinc-400">
                        {getLibraryCount(library)}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  title="Library actions"
                  className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 sm:self-auto dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {showBrowser && (
        <DirectoryBrowser
          currentPath={browserPath}
          parentPath={parentPath}
          directories={directories}
          loading={loadingDirectories}
          error={browserError}
          onClose={closeBrowser}
          onNavigate={loadDirectories}
          onSelect={selectDirectory}
        />
      )}
    </>
  );
}

function DirectoryBrowser({
  currentPath,
  parentPath,
  directories,
  loading,
  error,
  onClose,
  onNavigate,
  onSelect,
}: {
  currentPath: string;
  parentPath: string | null;
  directories: Directory[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onSelect: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div>
            <h3 className="font-semibold text-zinc-950 dark:text-white">
              Choose Directory
            </h3>

            <p className="mt-0.5 text-xs text-zinc-500">
              Select a folder on the LumaVault server.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (parentPath) {
                  onNavigate(parentPath);
                }
              }}
              disabled={!parentPath || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:hover:bg-zinc-900"
              title="Parent directory"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1 rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-900">
              <p className="truncate font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {currentPath || "Loading..."}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : directories.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center text-center">
              <Folder className="h-9 w-9 text-zinc-300 dark:text-zinc-700" />

              <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                No subdirectories
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                You can select this directory.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {directories.map((directory) => (
                <button
                  key={directory.path}
                  type="button"
                  onDoubleClick={() =>
                    onNavigate(directory.path)
                  }
                  onClick={() =>
                    onNavigate(directory.path)
                  }
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  <Folder className="h-5 w-5 shrink-0 text-zinc-400" />

                  <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {directory.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">
              Selected directory
            </p>

            <p className="truncate font-mono text-xs text-zinc-700 dark:text-zinc-300">
              {currentPath}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg px-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSelect}
              disabled={!currentPath || loading}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <FolderOpen className="h-4 w-4" />
              Select This Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}