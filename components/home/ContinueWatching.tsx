"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ContinueItem = {
  id: string;
  title: string;
  subtitle: string;
  image: string | null;
  progress: number;
  duration: string;
  remaining: string;
};

type ProgressResponse = {
  success: boolean;
  progress?: Array<{
    id: string;
    position: number;
    completed: boolean;
    updatedAt: string;

    episode: {
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
  }>;

  count?: number;
  error?: string;
};

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) {
    return "--";
  }

  const totalMinutes = Math.max(1, Math.round(seconds / 60));

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatRemaining(
  seconds: number | null,
  position: number,
) {
  if (!seconds || seconds <= 0) {
    return "";
  }

  const remainingSeconds = Math.max(
    0,
    seconds - position,
  );

  const totalMinutes = Math.ceil(
    remainingSeconds / 60,
  );

  if (totalMinutes < 60) {
    return `${totalMinutes} min left`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h left`;
  }

  return `${hours}h ${minutes}m left`;
}

function getProgress(
  position: number,
  duration: number | null,
) {
  if (!duration || duration <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      (position / duration) * 100,
    ),
  );
}

function getImage(
  thumbnail: string | null,
  backdrop: string | null,
  poster: string | null,
) {
  return (
    thumbnail ||
    backdrop ||
    poster ||
    null
  );
}

export function ContinueWatching() {
  const [items, setItems] = useState<
    ContinueItem[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadContinueWatching =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          "/api/progress",
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load continue watching",
          );
        }

        const data: ProgressResponse =
          await response.json();

        if (
          !data.success ||
          !data.progress
        ) {
          setItems([]);
          return;
        }

        const mappedItems: ContinueItem[] =
          data.progress
            .filter(
              (item) =>
                !item.completed &&
                item.position > 0,
            )
            .map((item) => {
              const episode =
                item.episode;

              const duration =
                episode.duration;

              return {
                id: episode.id,

                title:
                  episode.season.series
                    .title,

                subtitle:
                  `S${String(
                    episode.season.number,
                  ).padStart(
                    2,
                    "0",
                  )} E${String(
                    episode.number,
                  ).padStart(
                    2,
                    "0",
                  )} • ${
                    episode.title
                  }`,

                image: getImage(
                  episode.thumbnail,
                  episode.season.series
                    .backdrop,
                  episode.season.series
                    .poster,
                ),

                /*
                 * If duration is known,
                 * calculate the real percentage.
                 *
                 * If duration is unknown,
                 * keep 0 rather than inventing
                 * a percentage.
                 */
                progress:
                  duration
                    ? getProgress(
                        item.position,
                        duration,
                      )
                    : 0,

                duration:
                  formatDuration(
                    duration,
                  ),

                /*
                 * When duration isn't known,
                 * show how much has actually
                 * been watched.
                 */
                remaining:
                  duration
                    ? formatRemaining(
                        duration,
                        item.position,
                      )
                    : `${item.position}s watched`,
              };
            });

        setItems(mappedItems);
      } catch (error) {
        console.error(
          "Failed to load continue watching:",
          error,
        );

        setError(
          "Failed to load continue watching",
        );
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadContinueWatching();
  }, [loadContinueWatching]);

  async function removeItem(id: string) {
    const previousItems = items;

    /*
     * Remove immediately from UI.
     */
    setItems((current) =>
      current.filter(
        (item) => item.id !== id,
      ),
    );

    try {
      const response = await fetch(
        `/api/progress?episodeId=${encodeURIComponent(
          id,
        )}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error(
          "Failed to remove progress",
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.error ||
            "Failed to remove progress",
        );
      }
    } catch (error) {
      console.error(
        "Failed to remove progress:",
        error,
      );

      /*
       * Restore the card if the
       * database deletion failed.
       */
      setItems(previousItems);
    }
  }

  /*
   * Loading state
   */
  if (loading) {
    return (
      <section className="relative">
        <div className="mb-5">
          <div className="mb-2 h-3 w-40 animate-pulse rounded bg-white/10" />

          <div className="h-7 w-56 animate-pulse rounded bg-white/10" />
        </div>

        <div
          className="
            -mx-4
            flex
            gap-4
            overflow-hidden
            px-4
            sm:-mx-6
            sm:px-6
            lg:-mx-10
            lg:px-10
          "
        >
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              key={index}
              className="
                w-[270px]
                shrink-0
                overflow-hidden
                rounded-xl
                bg-zinc-900
                sm:w-[310px]
                lg:w-[340px]
              "
            >
              <div className="aspect-video animate-pulse bg-zinc-800" />

              <div className="h-1 bg-white/5" />

              <div className="space-y-3 p-4">
                <div className="h-4 w-32 animate-pulse rounded bg-white/10" />

                <div className="h-3 w-48 animate-pulse rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  /*
   * Error state
   */
  if (error) {
    return null;
  }

  /*
   * Nothing to continue.
   *
   * This is expected when there are
   * no unfinished progress records.
   */
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="relative">
      {/* Heading */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-red-500">
            Pick up where you left off
          </p>

          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Continue Watching
          </h2>
        </div>

        <Link
          href="/library?filter=continue"
          className="
            hidden
            text-sm
            font-medium
            text-white/40
            transition
            hover:text-white
            sm:block
          "
        >
          View all
        </Link>
      </div>

      {/* Cards */}
      <div
        className="
          -mx-4
          flex
          gap-4
          overflow-x-auto
          px-4
          pb-4
          scrollbar-none
          sm:-mx-6
          sm:px-6
          lg:-mx-10
          lg:px-10
        "
      >
        {items.map((item) => (
          <ContinueCard
            key={item.id}
            item={item}
            onRemove={removeItem}
          />
        ))}
      </div>
    </section>
  );
}

function ContinueCard({
  item,
  onRemove,
}: {
  item: ContinueItem;
  onRemove: (id: string) => void;
}) {
  return (
    <article
      className="
        group
        relative
        w-[270px]
        shrink-0
        overflow-hidden
        rounded-xl
        bg-zinc-900
        transition-all
        duration-300
        hover:-translate-y-1
        hover:bg-zinc-800
        hover:shadow-2xl
        hover:shadow-black/50
        sm:w-[310px]
        lg:w-[340px]
      "
    >
      {/* Thumbnail */}
      <Link
        href={`/watch/${item.id}`}
        className="
          relative
          block
          aspect-video
          overflow-hidden
        "
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.title}
            fill
            sizes="
              (max-width: 640px) 270px,
              (max-width: 1024px) 310px,
              340px
            "
            className="
              object-cover
              transition
              duration-500
              group-hover:scale-105
            "
          />
        ) : (
          <div
            className="
              absolute
              inset-0
              flex
              items-center
              justify-center
              bg-gradient-to-br
              from-zinc-800
              via-zinc-900
              to-black
              px-6
            "
          >
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/20">
                Continue Watching
              </p>

              <p className="mt-2 line-clamp-2 text-sm font-semibold text-white/40">
                {item.title}
              </p>
            </div>
          </div>
        )}

        {/* Dark overlay */}
        <div
          className="
            absolute
            inset-0
            bg-gradient-to-t
            from-black/80
            via-transparent
            to-black/10
          "
        />

        {/* Play button */}
        <div
          className="
            absolute
            inset-0
            flex
            items-center
            justify-center
            opacity-0
            transition
            duration-300
            group-hover:opacity-100
          "
        >
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-full
              bg-white
              text-black
              shadow-xl
              transition
              hover:scale-110
            "
          >
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </div>
        </div>

        {/* Remaining / watched */}
        {item.remaining && (
          <span
            className="
              absolute
              bottom-3
              left-3
              rounded-md
              bg-black/70
              px-2
              py-1
              text-[10px]
              font-medium
              text-white/80
              backdrop-blur-sm
            "
          >
            {item.remaining}
          </span>
        )}

        {/* Remove */}
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            onRemove(item.id);
          }}
          className="
            absolute
            right-3
            top-3
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-full
            bg-black/60
            text-white/60
            opacity-0
            backdrop-blur-sm
            transition
            hover:bg-black/80
            hover:text-white
            group-hover:opacity-100
          "
          aria-label={`Remove ${item.title} from continue watching`}
        >
          <X className="h-4 w-4" />
        </button>
      </Link>

      {/* Progress */}
      <div className="h-1 w-full bg-white/10">
        {item.progress > 0 && (
          <div
            className="
              h-full
              bg-red-600
              transition-all
              duration-500
            "
            style={{
              width: `${item.progress}%`,
            }}
          />
        )}
      </div>

      {/* Information */}
      <div className="p-4">
        <h3 className="truncate text-sm font-semibold text-white">
          {item.title}
        </h3>

        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-white/40">
            {item.subtitle}
          </p>

          <span className="shrink-0 text-[10px] text-white/30">
            {item.duration}
          </span>
        </div>
      </div>
    </article>
  );
}