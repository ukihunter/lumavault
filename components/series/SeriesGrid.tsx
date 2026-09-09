
"use client";

import { useEffect, useState } from "react";

import {
  SeriesCard,
  type SeriesCardData,
} from "./SeriesCard";

type SeriesResponse = {
  success: boolean;
  series: SeriesCardData[];
  count: number;
};

export function SeriesGrid() {
  const [series, setSeries] = useState<SeriesCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSeries = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/series", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load series");
        }

        const data: SeriesResponse = await response.json();

        if (!data.success || !Array.isArray(data.series)) {
          throw new Error("Invalid series response");
        }

        if (!cancelled) {
          setSeries(data.series);
        }
      } catch (err) {
        console.error("Failed to load series:", err);

        if (!cancelled) {
          setError("Failed to load series.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSeries();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[2/3] animate-pulse rounded-xl bg-zinc-900"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center">
        <p className="text-sm text-red-400">{error}</p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-10 text-center">
        <h3 className="text-lg font-semibold text-white">
          No series found
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          Your series library is currently empty.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {series.map((item) => (
        <SeriesCard
          key={item.id}
          series={item}
        />
      ))}
    </div>
  );
}

