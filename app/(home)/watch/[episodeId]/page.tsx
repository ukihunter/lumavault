
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db/prisma";
import VideoPlayer from "@/components/player/VideoPlayer";

type PageProps = {
  params: Promise<{
    episodeId: string;
  }>;
};

export default async function WatchPage({
  params,
}: PageProps) {
  const { episodeId } = await params;

  const episode = await prisma.episode.findUnique({
    where: {
      id: episodeId,
    },

    select: {
      id: true,
      number: true,
      title: true,
      description: true,
      duration: true,
      thumbnail: true,

      season: {
        select: {
          id: true,
          number: true,
          title: true,

          series: {
            select: {
              id: true,
              title: true,
              description: true,
              year: true,
              poster: true,
              backdrop: true,
              voteAverage: true,
            },
          },

          episodes: {
            orderBy: {
              number: "asc",
            },

            select: {
              id: true,
              number: true,
              title: true,
              thumbnail: true,
              duration: true,

              progress: {
                select: {
                  position: true,
                  completed: true,
                },
              },
            },
          },
        },
      },

      progress: {
        select: {
          position: true,
          completed: true,
        },
      },

      mediaSource: {
        select: {
          type: true,
        },
      },
    },
  });

  if (!episode || !episode.mediaSource) {
    notFound();
  }

  const {
    season,
    progress,
  } = episode;

  const episodes = season.episodes;

  const currentIndex = episodes.findIndex(
    (item) => item.id === episode.id
  );

  const previousEpisode =
    currentIndex > 0
      ? episodes[currentIndex - 1]
      : null;

  const nextEpisode =
    currentIndex >= 0 &&
    currentIndex < episodes.length - 1
      ? episodes[currentIndex + 1]
      : null;

  const watchedPercentage =
    episode.duration &&
    episode.duration > 0 &&
    progress &&
    progress.position > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (progress.position /
              (episode.duration * 60)) *
              100
          )
        )
      : 0;

  const formatDuration = (
    minutes: number | null
  ) => {
    if (!minutes || minutes <= 0) {
      return null;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }

    return `${remainingMinutes}m`;
  };

  const formatTime = (seconds: number) => {
    if (
      !Number.isFinite(seconds) ||
      seconds <= 0
    ) {
      return "0:00";
    }

    const total = Math.floor(seconds);

    const hours = Math.floor(total / 3600);

    const minutes = Math.floor(
      (total % 3600) / 60
    );

    const remaining = total % 60;

    if (hours > 0) {
      return `${hours}:${String(
        minutes
      ).padStart(
        2,
        "0"
      )}:${String(
        remaining
      ).padStart(
        2,
        "0"
      )}`;
    }

    return `${minutes}:${String(
      remaining
    ).padStart(2, "0")}`;
  };

  return (
    <main className="min-h-screen bg-black text-white">
      {/* -------------------------------------------------- */}
      {/* Player                                             */}
      {/* -------------------------------------------------- */}

      <section className="mx-auto  w-full max-w-[1600px] mt-16">
        <VideoPlayer
          episodeId={episode.id}
          title={episode.title}
          seriesTitle={season.series.title}
          seasonNumber={season.number}
          episodeNumber={episode.number}
          description={episode.description}
          initialPosition={
            progress?.position ?? 0
          }
          completed={
            progress?.completed ?? false
          }
        />
      </section>

      {/* -------------------------------------------------- */}
      {/* Episode information                                */}
      {/* -------------------------------------------------- */}

      <section className="mx-auto max-w-[1400px] px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <Link
            href={`/series/${season.series.id}`}
            className="transition hover:text-white"
          >
            {season.series.title}
          </Link>

          <span>•</span>

          <span>
            {season.title ||
              `Season ${season.number}`}
          </span>

          <span>•</span>

          <span>
            Episode {episode.number}
          </span>
        </div>

        {/* Title */}
        <div className="mt-3">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {episode.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
            <span>
              S{String(
                season.number
              ).padStart(
                2,
                "0"
              )}{" "}
              E{String(
                episode.number
              ).padStart(
                2,
                "0"
              )}
            </span>

            {episode.duration && (
              <>
                <span className="text-zinc-700">
                  •
                </span>

                <span>
                  {formatDuration(
                    episode.duration
                  )}
                </span>
              </>
            )}

            {progress?.completed && (
              <>
                <span className="text-zinc-700">
                  •
                </span>

                <span className="font-medium text-zinc-300">
                  Watched
                </span>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {episode.description && (
          <p className="mt-5 max-w-4xl text-sm leading-7 text-zinc-400 sm:text-base">
            {episode.description}
          </p>
        )}

        {/* Watch progress */}
        {progress &&
          progress.position > 0 &&
          !progress.completed && (
            <div className="mt-6 max-w-xl">
              <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                <span>
                  Resume position
                </span>

                <span>
                  {formatTime(
                    progress.position
                  )}
                  {episode.duration
                    ? ` / ${formatDuration(
                        episode.duration
                      )}`
                    : ""}
                </span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-red-600"
                  style={{
                    width: `${watchedPercentage}%`,
                  }}
                />
              </div>
            </div>
          )}

        {/* ------------------------------------------------ */}
        {/* Previous / Next                                  */}
        {/* ------------------------------------------------ */}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {previousEpisode ? (
            <Link
              href={`/watch/${previousEpisode.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>

              Previous Episode
            </Link>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-zinc-900 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-700">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>

              Previous Episode
            </span>
          )}

          {nextEpisode && (
            <Link
              href={`/watch/${nextEpisode.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Next Episode

              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          )}

          <Link
            href={`/series/${season.series.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            View Series
          </Link>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* Series information                                 */}
      {/* -------------------------------------------------- */}

      <section className="border-t border-zinc-900">
        <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Poster */}
            {season.series.poster && (
              <Link
                href={`/series/${season.series.id}`}
                className="relative hidden h-40 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-900 sm:block"
              >
                <Image
                  src={season.series.poster}
                  alt={season.series.title}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </Link>
            )}

            {/* Series details */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/series/${season.series.id}`}
                  className="text-xl font-bold text-white transition hover:text-zinc-300"
                >
                  {season.series.title}
                </Link>

                {season.series.year && (
                  <span className="text-sm text-zinc-500">
                    {season.series.year}
                  </span>
                )}

                {season.series.voteAverage &&
                  season.series.voteAverage >
                    0 && (
                    <span className="text-sm text-zinc-400">
                      ★{" "}
                      {season.series.voteAverage.toFixed(
                        1
                      )}
                    </span>
                  )}
              </div>

              {season.series.description && (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">
                  {season.series.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* Current season                                     */}
      {/* -------------------------------------------------- */}

      <section className="border-t border-zinc-900">
        <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-500">
                Current Season
              </p>

              <h2 className="mt-2 text-2xl font-bold text-white">
                {season.title ||
                  `Season ${season.number}`}
              </h2>
            </div>

            <span className="text-sm text-zinc-500">
              {episodes.length}{" "}
              {episodes.length === 1
                ? "Episode"
                : "Episodes"}
            </span>
          </div>

          <div className="space-y-3">
            {episodes.map((item) => {
              const isCurrent =
                item.id === episode.id;

              const itemProgress =
                item.progress;

              const itemPercentage =
                item.duration &&
                item.duration > 0 &&
                itemProgress &&
                itemProgress.position > 0
                  ? Math.min(
                      100,
                      Math.max(
                        0,
                        (itemProgress.position /
                          (item.duration *
                            60)) *
                          100
                      )
                    )
                  : 0;

              return (
                <Link
                  key={item.id}
                  href={`/watch/${item.id}`}
                  className={[
                    "group flex flex-col overflow-hidden rounded-xl border transition sm:flex-row",
                    isCurrent
                      ? "border-red-600/50 bg-red-950/10"
                      : "border-zinc-900 bg-zinc-950 hover:border-zinc-800 hover:bg-zinc-900/70",
                  ].join(" ")}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-zinc-900 sm:w-56">
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="224px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                        No thumbnail
                      </div>
                    )}

                    <div className="absolute left-3 top-3 rounded-md bg-black/75 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
                      E
                      {String(
                        item.number
                      ).padStart(
                        2,
                        "0"
                      )}
                    </div>

                    {isCurrent && (
                      <div className="absolute bottom-3 left-3 rounded-md bg-red-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Playing
                      </div>
                    )}

                    {item.progress &&
                      item.progress.position >
                        0 &&
                      !item.progress.completed && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                          <div
                            className="h-full bg-red-600"
                            style={{
                              width: `${Math.max(
                                2,
                                itemPercentage
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                  </div>

                  {/* Episode data */}
                  <div className="flex min-w-0 flex-1 items-center p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-zinc-500">
                          Episode{" "}
                          {item.number}
                        </span>

                        {item.duration && (
                          <>
                            <span className="text-zinc-700">
                              •
                            </span>

                            <span className="text-xs text-zinc-500">
                              {formatDuration(
                                item.duration
                              )}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="mt-1 truncate text-base font-semibold text-white">
                        {item.title}
                      </h3>

                      {item.progress &&
                        item.progress.position >
                          0 &&
                        !item.progress.completed && (
                          <p className="mt-2 text-xs text-zinc-500">
                            Continue from{" "}
                            {formatTime(
                              item.progress
                                .position
                            )}
                          </p>
                        )}

                      {item.progress
                        ?.completed && (
                        <p className="mt-2 text-xs text-zinc-500">
                          Watched
                        </p>
                      )}
                    </div>

                    <div className="ml-4 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition group-hover:bg-white group-hover:text-black sm:flex">
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
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
