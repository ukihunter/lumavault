"use client";

import { useEffect, useState } from "react";

type LibraryType = "MOVIES" | "SERIES";

type Library = {
  id: string;
  name: string;
  path: string;
  type: LibraryType;
  _count?: {
    movies: number;
    series: number;
  };
};

type Directory = {
  name: string;
  path: string;
};

type DirectoryBrowserResponse = {
  success: boolean;
  currentPath: string;
  parentPath: string | null;
  directories: Directory[];
  roots: string[];
  error?: string;
};

type FormState = {
  name: string;
  type: LibraryType;
  path: string;
};

const initialForm: FormState = {
  name: "",
  type: "MOVIES",
  path: "",
};

export default function MediaManager() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState<FormState>(initialForm);

  const [showBrowser, setShowBrowser] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function loadLibraries() {
    try {
      setLoading(true);

      const response = await fetch("/api/library", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ?? "Failed to load libraries.",
        );
      }

      setLibraries(data.libraries ?? []);
    } catch (error) {
      console.error("Failed to load libraries:", error);

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to load libraries.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLibraries();
  }, []);

  function updateForm<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleCreateLibrary(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage(null);

    const name = form.name.trim();
    const mediaPath = form.path.trim();

    if (!name) {
      setMessage({
        type: "error",
        text: "Please enter a library name.",
      });
      return;
    }

    if (!mediaPath) {
      setMessage({
        type: "error",
        text: "Please enter or select a media directory.",
      });
      return;
    }

    try {
      setCreating(true);

      const response = await fetch("/api/library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          type: form.type,
          path: mediaPath,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ?? "Failed to create library.",
        );
      }

      setLibraries((current) => [
        ...current,
        data.library,
      ]);

      setForm(initialForm);

      setMessage({
        type: "success",
        text: "Library created successfully.",
      });
    } catch (error) {
      console.error("Failed to create library:", error);

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to create library.",
      });
    } finally {
      setCreating(false);
    }
  }

  function handleDirectorySelected(directoryPath: string) {
    updateForm("path", directoryPath);
    setShowBrowser(false);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-white">
          Media Manager
        </h1>

        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Manage the directories that LumaVault scans for movies
          and TV series.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add Library */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
            Add Library
          </h2>

          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Add a directory containing your media files or ZIP
            archives.
          </p>
        </div>

        <form
          onSubmit={handleCreateLibrary}
          className="space-y-5"
        >
          {/* Library Name */}
          <div>
            <label
              htmlFor="library-name"
              className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Library name
            </label>

            <input
              id="library-name"
              type="text"
              value={form.name}
              onChange={(event) =>
                updateForm("name", event.target.value)
              }
              placeholder="My Movies"
              disabled={creating}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
            />
          </div>

          {/* Library Type */}
          <div>
            <label
              htmlFor="library-type"
              className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Library type
            </label>

            <select
              id="library-type"
              value={form.type}
              onChange={(event) =>
                updateForm(
                  "type",
                  event.target.value as LibraryType,
                )
              }
              disabled={creating}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
            >
              <option value="MOVIES">Movies</option>
              <option value="SERIES">TV Series</option>
            </select>
          </div>

          {/* Directory */}
          <div>
            <label
              htmlFor="library-path"
              className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Media directory
            </label>

            <div className="flex gap-2">
              <input
                id="library-path"
                type="text"
                value={form.path}
                onChange={(event) =>
                  updateForm(
                    "path",
                    event.target.value,
                  )
                }
                disabled={creating}
                placeholder="/run/media/uki/..."
                className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
              />

              <button
                type="button"
                onClick={() => setShowBrowser(true)}
                disabled={creating}
                className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                Browse
              </button>
            </div>

            <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              LumaVault is running on Linux, so enter the Linux
              mount path. For example:
              <span className="ml-1 font-mono text-zinc-700 dark:text-zinc-300">
                /run/media/uki/166469196468FCBD/Games/Ben 10
              </span>
            </p>

            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              A Windows path such as{" "}
              <span className="font-mono">
                D:\Games\Ben 10
              </span>{" "}
              cannot be used directly by the Linux server.
            </p>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {creating
                ? "Creating..."
                : "Add Library"}
            </button>
          </div>
        </form>
      </section>

      {/* Existing Libraries */}
      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
            Your Libraries
          </h2>

          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Directories currently registered with LumaVault.
          </p>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
            </div>
          </div>
        ) : libraries.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              No libraries yet
            </p>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Add your first movie or TV series directory
              above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {libraries.map((library) => (
              <div
                key={library.id}
                className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-zinc-950 dark:text-white">
                      {library.name}
                    </h3>

                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {library.type === "MOVIES"
                        ? "Movies"
                        : "TV Series"}
                    </span>
                  </div>

                  <p className="mt-2 break-all font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {library.path}
                  </p>

                  {library._count && (
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {library.type === "MOVIES"
                        ? `${library._count.movies} movies`
                        : `${library._count.series} series`}
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Directory Browser */}
      {showBrowser && (
        <DirectoryBrowser
          initialPath={form.path || undefined}
          onClose={() => setShowBrowser(false)}
          onSelect={handleDirectorySelected}
        />
      )}
    </div>
  );
}

type DirectoryBrowserProps = {
  initialPath?: string;
  onClose: () => void;
  onSelect: (path: string) => void;
};

function DirectoryBrowser({
  initialPath,
  onClose,
  onSelect,
}: DirectoryBrowserProps) {
  const [currentPath, setCurrentPath] = useState(
    initialPath || "",
  );

  const [directories, setDirectories] = useState<
    Directory[]
  >([]);

  const [parentPath, setParentPath] = useState<
    string | null
  >(null);

  const [roots, setRoots] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(
    null,
  );

  async function loadDirectory(pathToLoad?: string) {
    try {
      setLoading(true);
      setError(null);

      const url = new URL(
        "/api/filesystem/directories",
        window.location.origin,
      );

      if (pathToLoad) {
        url.searchParams.set("path", pathToLoad);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
      });

      const data =
        (await response.json()) as DirectoryBrowserResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "Failed to load directories.",
        );
      }

      setCurrentPath(data.currentPath);
      setParentPath(data.parentPath);
      setDirectories(data.directories);
      setRoots(data.roots);
    } catch (error) {
      console.error(
        "Failed to load directories:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load directories.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDirectory(
      initialPath || undefined,
    );
  }, [initialPath]);

  function openDirectory(directoryPath: string) {
    loadDirectory(directoryPath);
  }

  function goBack() {
    if (!parentPath) {
      return;
    }

    loadDirectory(parentPath);
  }

  function selectCurrentDirectory() {
    if (!currentPath) {
      return;
    }

    onSelect(currentPath);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2 className="font-semibold text-zinc-950 dark:text-white">
              Select Directory
            </h2>

            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Select the directory containing your media.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Current Path */}
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="rounded-xl bg-zinc-100 px-4 py-3 dark:bg-zinc-900">
            <p className="break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
              {currentPath || "Loading..."}
            </p>
          </div>
        </div>

        {/* Browser */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {/* Parent */}
          {parentPath && (
            <button
              type="button"
              onClick={goBack}
              disabled={loading}
              className="mb-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-900"
            >
              <span className="text-lg">↩</span>

              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                ..
              </span>
            </button>
          )}

          {/* Roots */}
          {!currentPath && roots.length > 0 && (
            <div className="space-y-1">
              {roots.map((root) => (
                <button
                  key={root}
                  type="button"
                  onClick={() =>
                    openDirectory(root)
                  }
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  <span>📁</span>

                  <span className="break-all text-zinc-700 dark:text-zinc-300">
                    {root}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-2">
              <div className="h-12 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
              <div className="h-12 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
              <div className="h-12 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Directories */}
          {!loading &&
            !error &&
            directories.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No subdirectories found.
                </p>
              </div>
            )}

          {!loading &&
            !error &&
            directories.length > 0 && (
              <div className="space-y-1">
                {directories.map((directory) => (
                  <button
                    key={directory.path}
                    type="button"
                    onClick={() =>
                      openDirectory(
                        directory.path,
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  >
                    <span className="text-lg">
                      📁
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {directory.name}
                      </span>

                      <span className="mt-0.5 block truncate font-mono text-xs text-zinc-500 dark:text-zinc-500">
                        {directory.path}
                      </span>
                    </span>

                    <span className="text-zinc-400">
                      →
                    </span>
                  </button>
                ))}
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={selectCurrentDirectory}
            disabled={!currentPath || loading}
            className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Select This Directory
          </button>
        </div>
      </div>
    </div>
  );
}