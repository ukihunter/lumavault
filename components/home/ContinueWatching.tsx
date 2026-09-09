
"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type MovieProgress = {
  id: string;
  title: string;
  duration: number | null;
  poster: string | null;
  backdrop: string | null;
};

type EpisodeProgress = {
  id: string;
  number: number;
  title: string;
  duration: number | null;
  thumbnail: string | null;
  season: {
    number: number;
    series: {
      id: string;
      title: string;
      poster: string | null;
      backdrop: string | null;
    };
  };
};

type ProgressItem = {
  id: string;
  position: number;
  completed: boolean;
  updatedAt: string;
  movie: MovieProgress | null;
  episode: EpisodeProgress | null;
};

type ProgressResponse = {
  success: boolean;
  progress: ProgressItem[];
  count: number;
};

type ContinueItem =
  | {
      kind: "movie";
      progressId: string;
      id: string;
      title: string;
      subtitle: string;
      image: string | null;
      position: number;
      duration: number | null;
      updatedAt: string;
    }
  | {
      kind: "episode";
      progressId: string;
      id: string;
      title: string;
      subtitle: string;
      image: string | null;
      position: number;
      duration: number | null;
      updatedAt: string;
    };

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function getProgressPercent(position: number, duration: number | null) {
  if (!duration || duration <= 0) {
    return 0;
  }

  const percent = (position / duration) * 100;

  return Math.min(100, Math.max(0, percent));
}

export function ContinueWatching() {
  const [items, setItems] = useState<ContinueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    try {
      const response = await fetch("/api/progress", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to load progress: ${response.status}`);
      }

      const data: ProgressResponse = await response.json();

      if (!data.success || !Array.isArray(data.progress)) {
        setItems([]);
        return;
      }

      const mapped: ContinueItem[] = [];

      for (const progress of data.progress) {
        /**
         * MOVIE
         */
        if (progress.movie) {
          mapped.push({
            kind: "movie",
            progressId: progress.id,
            id: progress.movie.id,
            title: progress.movie.title,
            subtitle: "Movie",
            image:
              progress.movie.backdrop ||
              progress.movie.poster ||
              null,
            position: progress.position,
            duration: progress.movie.duration,
            updatedAt: progress.updatedAt,
          });

          continue;
        }

        /**
         * EPISODE
         */
        if (progress.episode) {
          mapped.push({
            kind: "episode",
            progressId: progress.id,
            id: progress.episode.id,
            title: progress.episode.title,
            subtitle: `${progress.episode.season.series.title} • S${String(
              progress.episode.season.number
            ).padStart(2, "0")} E${String(progress.episode.number).padStart(
              2,
              "0"
            )}`,
            image:
              progress.episode.thumbnail ||
              progress.episode.season.series.backdrop ||
              progress.episode.season.series.poster ||
              null,
            position: progress.position,
            duration: progress.episode.duration,
            updatedAt: progress.updatedAt,
          });
        }
      }

      /**
       * API is already ordered by updatedAt desc,
       * but sort again here to guarantee the UI order.
       */
      mapped.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() -
          new Date(a.updatedAt).getTime()
      );

      console.log("Continue Watching mapped items:", mapped);

      setItems(mapped);
    } catch (error) {
      console.error("Failed to load continue watching:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgress();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadProgress();
      }
    };

    const handleFocus = () => {
      loadProgress();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadProgress]);

  const removeProgress = async (item: ContinueItem) => {
    try {
      const query =
        item.kind === "movie"
          ? `movieId=${encodeURIComponent(item.id)}`
          : `episodeId=${encodeURIComponent(item.id)}`;

      const response = await fetch(`/api/progress?${query}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove progress");
      }

      setItems((current) =>
        current.filter((entry) => entry.progressId !== item.progressId)
      );
    } catch (error) {
      console.error("Failed to remove progress:", error);
    }
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="h-7 w-48 animate-pulse rounded bg-zinc-800" />

        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-44 w-72 shrink-0 animate-pulse rounded-xl bg-zinc-900"
            />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Continue Watching
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            Pick up where you left off
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
        {items.map((item) => {
          const href =
            item.kind === "movie"
              ? `/movies/${item.id}`
              : `/watch/${item.id}`;

          const progressPercent = getProgressPercent(
            item.position,
            item.duration
          );

          return (
            <div
              key={item.progressId}
              className="group relative w-72 shrink-0 overflow-hidden rounded-xl bg-zinc-900"
            >
              <Link href={href} className="block">
                <div className="relative aspect-video overflow-hidden bg-zinc-800">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="288px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-sm text-zinc-500">
                      No image
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

                  {/* Content type */}
                  <div className="absolute left-3 top-3 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold tracking-wide text-white backdrop-blur">
                    {item.kind === "movie" ? "MOVIE" : "EPISODE"}
                  </div>

                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="ml-1"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Progress bar */}
                 {/* Progress bar */}
<div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
  <div
    className="h-full bg-red-600 transition-all duration-300"
    style={{
      width:
        item.position > 0
          ? item.duration && item.duration > 0
            ? `${Math.min(
                100,
                Math.max(2, (item.position / item.duration) * 100)
              )}%`
            : "8%"
          : "0%",
    }}
  />
</div>
                </div>

                <div className="space-y-1 p-3">
                  <h3 className="truncate text-sm font-semibold text-white">
                    {item.title}
                  </h3>

                  <p className="truncate text-xs text-zinc-400">
                    {item.subtitle}
                  </p>

                  <p className="text-xs text-zinc-500">
                    {formatTime(item.position)}
                    {item.duration
                      ? ` / ${formatTime(item.duration)}`
                      : " watched"}
                  </p>
                </div>
              </Link>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeProgress(item)}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-zinc-300 opacity-0 backdrop-blur transition-all hover:bg-black hover:text-white group-hover:opacity-100"
                title="Remove from Continue Watching"
                aria-label="Remove from Continue Watching"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

