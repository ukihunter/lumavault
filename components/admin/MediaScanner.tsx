"use client";

import {
CheckCircle2,
FileSearch,
Loader2,
RefreshCw,
ScanSearch,
XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type LibraryType = "MOVIES" | "SERIES";

type Library = {
id: string;
name: string;
path: string;
type: LibraryType;
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

type ScanResult = {
libraryId: string;
libraryName: string;

scannedFiles: number;
scannedArchives: number;

added: number;
updated: number;
skipped: number;

skippedDetails: string[];

errors: number;
errorDetails: string[];
};

type ScanResponse = {
success: boolean;
result?: ScanResult;
error?: string;
};

export default function MediaScanner() {
const [libraries, setLibraries] = useState<Library[]>([]);
const [selectedLibraryId, setSelectedLibraryId] = useState("");
const [loadingLibraries, setLoadingLibraries] = useState(true);
const [scanning, setScanning] = useState(false);
const [error, setError] = useState("");
const [result, setResult] = useState<ScanResult | null>(null);

const loadLibraries = useCallback(async () => {
try {
setLoadingLibraries(true);
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

  const nextLibraries = data.libraries ?? [];

  setLibraries(nextLibraries);

  setSelectedLibraryId((current) => {
    if (
      current &&
      nextLibraries.some(
        (library) => library.id === current,
      )
    ) {
      return current;
    }

    return nextLibraries[0]?.id ?? "";
  });
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
  setLoadingLibraries(false);
}


}, []);

useEffect(() => {
loadLibraries();
}, [loadLibraries]);

async function handleScan() {
if (!selectedLibraryId) {
setError("Select a library to scan.");
return;
}


try {
  setScanning(true);
  setError("");
  setResult(null);

  const response = await fetch(
    "/api/library/scan",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        libraryId: selectedLibraryId,
      }),
    },
  );

  const data: ScanResponse =
    await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.error || "Library scan failed",
    );
  }

  setResult(data.result ?? null);

  await loadLibraries();
} catch (error) {
  console.error(
    "Library scan failed:",
    error,
  );

  setError(
    error instanceof Error
      ? error.message
      : "Library scan failed",
  );
} finally {
  setScanning(false);
}

}

const selectedLibrary = libraries.find(
(library) =>
library.id === selectedLibraryId,
);

return ( <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white dark:border-zinc-800/70 dark:bg-zinc-950"> <div className="border-b border-zinc-200/70 p-5 dark:border-zinc-800/70"> <div className="flex items-start gap-3"> <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900"> <ScanSearch className="h-5 w-5 text-zinc-500 dark:text-zinc-400" /> </div>


      <div>
        <h3 className="font-medium text-zinc-950 dark:text-white">
          Scan Media
        </h3>

        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Search a library directory for new and
          changed video files.
        </p>
      </div>
    </div>
  </div>

  <div className="p-5">
    {error && (
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    )}

    {loadingLibraries ? (
      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading libraries...
      </div>
    ) : libraries.length === 0 ? (
      <div className="rounded-xl border border-dashed border-zinc-200 px-5 py-8 text-center dark:border-zinc-800">
        <FileSearch className="mx-auto h-7 w-7 text-zinc-300 dark:text-zinc-700" />

        <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          No libraries available
        </p>

        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
          Add a media library above before running
          a scan.
        </p>
      </div>
    ) : (
      <>
        <div>
          <label
            htmlFor="scan-library"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Library
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              id="scan-library"
              value={selectedLibraryId}
              disabled={scanning}
              onChange={(event) => {
                setSelectedLibraryId(
                  event.target.value,
                );
                setResult(null);
                setError("");
              }}
              className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
            >
              {libraries.map((library) => (
                <option
                  key={library.id}
                  value={library.id}
                >
                  {library.name} —{" "}
                  {library.type === "MOVIES"
                    ? "Movies"
                    : "TV Shows"}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleScan}
              disabled={
                scanning ||
                !selectedLibraryId
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanSearch className="h-4 w-4" />
              )}

              {scanning
                ? "Scanning..."
                : "Scan Library"}
            </button>
          </div>

          {selectedLibrary && (
            <p className="mt-2 truncate font-mono text-xs text-zinc-500 dark:text-zinc-500">
              {selectedLibrary.path}
            </p>
          )}
        </div>

        {scanning && (
          <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-4 w-4 animate-spin text-zinc-500" />

              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Scanning library...
                </p>

                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                  LumaVault is checking the
                  directory and updating the
                  database.
                </p>
              </div>
            </div>
          </div>
        )}

        {result && !scanning && (
          <div className="mt-5">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />

              <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
                Scan completed
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ScanStat
                label="Scanned"
                value={result.scannedFiles}
              />

              <ScanStat
                label="Added"
                value={result.added}
              />

              <ScanStat
                label="Updated"
                value={result.updated}
              />

              <ScanStat
                label="Skipped"
                value={result.skipped}
              />
            </div>

            {result.scannedArchives > 0 && (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
                      Archive videos scanned
                    </p>

                    <p className="mt-1 text-xl font-semibold text-zinc-950 dark:text-white">
                      {result.scannedArchives}
                    </p>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    ZIP entries
                  </p>
                </div>
              </div>
            )}

            {result.skippedDetails.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Skipped media
                    </p>

                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      These items were discovered but
                      were not added to the database.
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    {result.skippedDetails.length}
                  </span>
                </div>

                <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-amber-200/70 bg-white p-3 dark:border-amber-900/40 dark:bg-zinc-950">
                  <ul className="space-y-2 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                    {result.skippedDetails.map(
                      (detail, index) => (
                        <li
                          key={`${detail}-${index}`}
                          className="border-b border-zinc-200 pb-2 last:border-0 last:pb-0 dark:border-zinc-800"
                        >
                          <span className="mr-2 text-zinc-400">
                            {index + 1}.
                          </span>

                          {detail}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            )}

            {result.errors > 0 && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />

                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    {result.errors}{" "}
                    {result.errors === 1
                      ? "error"
                      : "errors"}{" "}
                    occurred
                  </p>
                </div>

                {result.errorDetails.length >
                  0 && (
                  <div className="mt-3 max-h-40 overflow-auto rounded-lg bg-red-100/70 p-3 dark:bg-red-950/50">
                    <ul className="space-y-1 font-mono text-xs text-red-700 dark:text-red-300">
                      {result.errorDetails.map(
                        (detail, index) => (
                          <li
                            key={`${detail}-${index}`}
                          >
                            {detail}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </>
    )}
  </div>
</div>


);
}

function ScanStat({
label,
value,
}: {
label: string;
value: number;
}) {
return ( <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"> <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
{label} </p>


  <p className="mt-1 text-xl font-semibold text-zinc-950 dark:text-white">
    {value}
  </p>
</div>


);
}
