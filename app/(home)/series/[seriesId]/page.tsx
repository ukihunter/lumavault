
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  EpisodeList,
  type EpisodeCardData,
} from "@/components/series/EpisodeList";
import { SeasonSelector } from "@/components/series/SeasonSelector";

type SeriesData = {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
  poster: string | null;
  backdrop: string | null;

  library: {
    id: string;
    name: string;
    path: string;
    type: string;
  };

  seasons: {
    id: string;
    number: number;
    title: string | null;
    episodes: EpisodeCardData[];
  }[];

  createdAt: string;
  updatedAt: string;
};

type SeriesResponse = {
  success: boolean;
  series: SeriesData;
  stats: {
    seasons: number;
    episodes: number;
  };
};

type SeriesPageProps = {
  params: Promise<{
    seriesId: string;
  }>;
};

function formatSeasonCount(count: number) {
  return `${count} ${count === 1 ? "Season" : "Seasons"}`;
}

function formatEpisodeCount(count: number) {
  return `${count} ${count === 1 ? "Episode" : "Episodes"}`;
}

export default function SeriesDetailsPage({
  params,
}: SeriesPageProps) {
  const [series, setSeries] = useState<SeriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    const loadSeries = async () => {
      try {
        const { seriesId } = await params;

        const response = await fetch(
          `/api/series/${encodeURIComponent(seriesId)}`,
          {
            cache: "no-store",
          }
        );

        if (response.status === 404) {
          if (!cancelled) {
            setNotFound(true);
          }

          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load series");
        }

        const data: SeriesResponse = await response.json();

        if (!data.success || !data.series) {
          throw new Error("Invalid series response");
        }

        if (cancelled) {
          return;
        }

        setSeries(data.series);

        if (data.series.seasons.length > 0) {
          setSelectedSeasonId(data.series.seasons[0].id);
        }
      } catch (error) {
        console.error("Failed to load series:", error);
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
  }, [params]);

  const selectedSeason = useMemo(() => {
    if (!series || !selectedSeasonId) {
      return null;
    }

    return (
      series.seasons.find(
        (season) => season.id === selectedSeasonId
      ) ?? null
    );
  }, [series, selectedSeasonId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black">
        <div className="h-[55vh] animate-pulse bg-zinc-950" />

        <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-10 sm:px-6 lg:px-10">
          <div className="h-10 w-64 animate-pulse rounded bg-zinc-900" />
          <div className="h-32 animate-pulse rounded-xl bg-zinc-900" />
        </div>
      </main>
    );
  }

  if (notFound || !series) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">
            Series not found
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            This series could not be found in your library.
          </p>

          <Link
            href="/series"
            className="mt-6 inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Back to Series
          </Link>
        </div>
      </main>
    );
  }

  const episodeCount = series.seasons.reduce(
    (total, season) => total + season.episodes.length,
    0
  );

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative min-h-[65vh] overflow-hidden">
        {series.backdrop && (
          <Image
            src={series.backdrop}
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        )}

        <div className="absolute inset-0 bg-black/45" />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/20" />

        <div className="relative z-10 mx-auto flex min-h-[65vh] max-w-[1600px] items-end px-4 pb-12 pt-24 sm:px-6 lg:px-10">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
              {series.year && <span>{series.year}</span>}

              <span>•</span>

              <span>{formatSeasonCount(series.seasons.length)}</span>

              <span>•</span>

              <span>{formatEpisodeCount(episodeCount)}</span>
            </div>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {series.title}
            </h1>

            {series.description && (
              <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
                {series.description}
              </p>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              {selectedSeason?.episodes[0] && (
                <Link
                  href={`/watch/${selectedSeason.episodes[0].id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>

                  Start Watching
                </Link>
              )}

              <Link
                href="/series"
                className="inline-flex items-center rounded-lg bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Back to Series
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-[1600px] px-4 pb-16 pt-10 sm:px-6 lg:px-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-500">
              Episodes
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              {selectedSeason
                ? selectedSeason.title ||
                  `Season ${selectedSeason.number}`
                : "Episodes"}
            </h2>
          </div>

          {series.library && (
            <div className="text-sm text-zinc-500">
              Library:{" "}
              <span className="text-zinc-300">
                {series.library.name}
              </span>
            </div>
          )}
        </div>

        <div className="mb-8">
          <SeasonSelector
            seasons={series.seasons}
            selectedSeasonId={selectedSeasonId}
            onSeasonChange={setSelectedSeasonId}
          />
        </div>

        {selectedSeason && (
          <EpisodeList episodes={selectedSeason.episodes} />
        )}
      </section>
    </main>
  );
}

