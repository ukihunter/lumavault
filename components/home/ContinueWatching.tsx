"use client";

import Image from "next/image";
import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

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

type ContinueItem = {
  kind: "movie" | "episode";
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
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "0:00";
  }

  const total = Math.floor(seconds);
  const hours = Math.floor(
    total / 3600,
  );
  const minutes = Math.floor(
    (total % 3600) / 60,
  );
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(
      minutes,
    ).padStart(2, "0")}:${String(
      secs,
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(
    secs,
  ).padStart(2, "0")}`;
}

function getProgressPercent(
  position: number,
  duration: number | null,
) {
  if (
    !duration ||
    duration <= 0
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      (position / duration) *
        100,
    ),
  );
}

export function ContinueWatching() {
  const [items, setItems] =
    useState<ContinueItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const loadProgress =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            "/api/progress",
            {
              method: "GET",
              cache: "no-store",
            },
          );

        if (!response.ok) {
          throw new Error(
            `Failed to load progress: ${response.status}`,
          );
        }

        const data: ProgressResponse =
          await response.json();

        if (
          !data.success ||
          !Array.isArray(
            data.progress,
          )
        ) {
          setItems([]);
          return;
        }

        const mapped: ContinueItem[] =
          [];

        for (const progress of
          data.progress) {
          if (progress.movie) {
            mapped.push({
              kind: "movie",
              progressId:
                progress.id,
              id: progress.movie.id,
              title:
                progress.movie.title,
              subtitle: "Movie",
              image:
                progress.movie
                  .backdrop ||
                progress.movie
                  .poster ||
                null,
              position:
                progress.position,
              duration:
                progress.movie
                  .duration,
              updatedAt:
                progress.updatedAt,
            });

            continue;
          }

          if (progress.episode) {
            mapped.push({
              kind: "episode",
              progressId:
                progress.id,
              id: progress.episode.id,
              title:
                progress.episode.title,
              subtitle: `${progress.episode.season.series.title} • S${String(
                progress.episode.season.number,
              ).padStart(
                2,
                "0",
              )} E${String(
                progress.episode.number,
              ).padStart(
                2,
                "0",
              )}`,
              image:
                progress.episode
                  .thumbnail ||
                progress.episode
                  .season.series
                  .backdrop ||
                progress.episode
                  .season.series
                  .poster ||
                null,
              position:
                progress.position,
              duration:
                progress.episode
                  .duration,
              updatedAt:
                progress.updatedAt,
            });
          }
        }

        mapped.sort(
          (a, b) =>
            new Date(
              b.updatedAt,
            ).getTime() -
            new Date(
              a.updatedAt,
            ).getTime(),
        );

        setItems(mapped);
      } catch (error) {
        console.error(
          "Failed to load continue watching:",
          error,
        );

        setItems([]);
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadProgress();

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void loadProgress();
        }
      };

    const handleFocus =
      () => {
        void loadProgress();
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [loadProgress]);

  const removeProgress =
    async (
      item: ContinueItem,
    ) => {
      try {
        const query =
          item.kind === "movie"
            ? `movieId=${encodeURIComponent(
                item.id,
              )}`
            : `episodeId=${encodeURIComponent(
                item.id,
              )}`;

        const response =
          await fetch(
            `/api/progress?${query}`,
            {
              method: "DELETE",
            },
          );

        if (!response.ok) {
          throw new Error(
            "Failed to remove progress",
          );
        }

        setItems(
          (current) =>
            current.filter(
              (entry) =>
                entry.progressId !==
                item.progressId,
            ),
        );
      } catch (error) {
        console.error(
          "Failed to remove progress:",
          error,
        );
      }
    };

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="h-7 w-48 animate-pulse rounded bg-zinc-800" />

        <div className="flex gap-3 overflow-hidden">
          {[
            1,
            2,
            3,
            4,
          ].map((item) => (
            <div
              key={item}
              className="aspect-video w-[220px] shrink-0 animate-pulse rounded-lg bg-zinc-900 sm:w-[250px] lg:w-[270px]"
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
      <div>
        <h2 className="text-xl font-semibold text-white">
          Continue Watching
        </h2>

        <p className="mt-1 text-sm text-zinc-400">
          Pick up where you left off
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide sm:gap-4">
        {items.map((item) => {
          const href =
            item.kind ===
            "movie"
              ? `/movies/${item.id}`
              : `/watch/${item.id}`;

          const progress =
            getProgressPercent(
              item.position,
              item.duration,
            );

          return (
            <article
              key={
                item.progressId
              }
              className="group relative w-[220px] shrink-0 sm:w-[250px] lg:w-[270px]"
            >
              <Link
                href={href}
                className="block"
              >
                <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-900 shadow-lg">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 220px, (max-width: 1024px) 250px, 270px"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-zinc-900 text-xs text-zinc-600">
                      No image
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                  <div className="absolute left-2.5 top-2.5 rounded bg-black/70 px-1.5 py-1 text-[9px] font-semibold tracking-wider text-white backdrop-blur">
                    {item.kind ===
                    "movie"
                      ? "MOVIE"
                      : "EPISODE"}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-xl">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="ml-0.5"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <div
                      className="h-full bg-red-600"
                      style={{
                        width:
                          progress > 0
                            ? `${Math.max(
                                2,
                                progress,
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>

                <div className="px-0.5 pt-2.5">
                  <h3 className="truncate text-sm font-medium text-white">
                    {item.title}
                  </h3>

                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {item.subtitle}
                  </p>

                  <p className="mt-1 text-[11px] text-zinc-600">
                    {formatTime(
                      item.position,
                    )}
                    {item.duration
                      ? ` / ${formatTime(
                          item.duration,
                        )}`
                      : ""}
                  </p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() =>
                  void removeProgress(
                    item,
                  )
                }
                title="Remove from Continue Watching"
                aria-label="Remove from Continue Watching"
                className="absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-zinc-300 opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-black hover:text-white"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}