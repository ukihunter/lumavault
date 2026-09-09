
"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

type Movie = {
  id: string;
  title: string;
  year: number | null;
  poster: string | null;
  backdrop: string | null;
  voteAverage: number | null;
  createdAt: string;
};

type Series = {
  id: string;
  title: string;
  year: number | null;
  poster: string | null;
  backdrop: string | null;
  voteAverage: number | null;
  createdAt: string;
};

type RecentMedia = {
  id: string;
  title: string;
  type: "Movie" | "Series";
  year: number | null;
  rating: string | null;
  image: string | null;
  added: string;
  createdAt: string;
};

const FALLBACK_IMAGE =
  "/placeholder-poster.jpg";

export function RecentlyAdded() {
  const [media, setMedia] = useState<
    RecentMedia[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState<
    string | null
  >(null);

  const scrollRef =
    useRef<HTMLDivElement | null>(null);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({
      left: -700,
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({
      left: 700,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    let cancelled = false;

    async function loadRecentlyAdded() {
      try {
        setLoading(true);
        setError(null);

        const [
          moviesResponse,
          seriesResponse,
        ] = await Promise.all([
          fetch("/api/movies", {
            cache: "no-store",
          }),

          fetch("/api/series", {
            cache: "no-store",
          }),
        ]);

        if (
          !moviesResponse.ok ||
          !seriesResponse.ok
        ) {
          throw new Error(
            "Failed to load library",
          );
        }

        const moviesData =
          await moviesResponse.json();

        const seriesData =
          await seriesResponse.json();

        if (
          !moviesData.success ||
          !seriesData.success
        ) {
          throw new Error(
            "Failed to load library data",
          );
        }

        const movies: Movie[] =
          moviesData.movies ?? [];

        const series: Series[] =
          seriesData.series ?? [];

        const movieItems: RecentMedia[] =
          movies.map((movie) => ({
            id: movie.id,
            title: movie.title,
            type: "Movie",
            year: movie.year,
            rating:
              movie.voteAverage !== null &&
              movie.voteAverage !== undefined
                ? movie.voteAverage.toFixed(1)
                : null,
            image:
              movie.poster ??
              movie.backdrop ??
              null,
            added: formatAddedDate(
              movie.createdAt,
            ),
            createdAt: movie.createdAt,
          }));

        const seriesItems: RecentMedia[] =
          series.map((item) => ({
            id: item.id,
            title: item.title,
            type: "Series",
            year: item.year,
            rating:
              item.voteAverage !== null &&
              item.voteAverage !== undefined
                ? item.voteAverage.toFixed(1)
                : null,
            image:
              item.poster ??
              item.backdrop ??
              null,
            added: formatAddedDate(
              item.createdAt,
            ),
            createdAt: item.createdAt,
          }));

        const combined = [
          ...movieItems,
          ...seriesItems,
        ]
          .sort(
            (a, b) =>
              new Date(
                b.createdAt,
              ).getTime() -
              new Date(
                a.createdAt,
              ).getTime(),
          )
          .slice(0, 10);

        if (!cancelled) {
          setMedia(combined);
        }
      } catch (error) {
        console.error(
          "Failed to load recently added media:",
          error,
        );

        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load media",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRecentlyAdded();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative">
      {/* Heading */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-red-500">
            Fresh to your vault
          </p>

          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Recently Added
          </h2>
        </div>

        <Link
          href="/library"
          className="
            group hidden items-center gap-1
            text-sm font-medium
            text-white/40
            transition
            hover:text-white
            sm:flex
          "
        >
          View all

          <ChevronRight
            className="
              h-4 w-4
              transition-transform
              group-hover:translate-x-1
            "
          />
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div
          className="
            -mx-4 flex gap-4 overflow-hidden px-4 pb-5
            sm:-mx-6 sm:gap-5 sm:px-6
            lg:-mx-10 lg:px-10
          "
        >
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              key={index}
              className="
                w-[145px] shrink-0
                sm:w-[170px]
                lg:w-[190px]
              "
            >
              <div
                className="
                  aspect-[2/3]
                  animate-pulse
                  rounded-lg
                  bg-zinc-900
                "
              />

              <div className="mt-3">
                <div className="h-4 animate-pulse rounded bg-zinc-900" />

                <div className="mt-2 h-3 w-24 animate-pulse rounded bg-zinc-900" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading &&
        !error &&
        media.length === 0 && (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-8 text-center text-sm text-white/40">
            No media found.
          </div>
        )}

      {/* Media carousel */}
      {!loading &&
        !error &&
        media.length > 0 && (
          <div className="group/carousel relative">
            {/* Left button */}
            <button
              type="button"
              onClick={scrollLeft}
              aria-label="Scroll recently added left"
              className="
                absolute left-2 top-1/2 z-20
                hidden -translate-y-1/2
                items-center justify-center
                rounded-full
                border border-white/10
                bg-black/80
                p-2
                text-white
                shadow-xl
                backdrop-blur-md
                transition
                hover:scale-105
                hover:bg-black
                sm:flex
                opacity-0
                group-hover/carousel:opacity-100
              "
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Scroll container */}
            <div
              ref={scrollRef}
              className="
                -mx-4 flex gap-4 overflow-x-auto px-4 pb-5
                scrollbar-none
                scroll-smooth
                sm:-mx-6 sm:gap-5 sm:px-6
                lg:-mx-10 lg:px-10
              "
            >
              {media.map((item) => (
                <MediaCard
                  key={`${item.type}-${item.id}`}
                  item={item}
                />
              ))}
            </div>

            {/* Right button */}
            <button
              type="button"
              onClick={scrollRight}
              aria-label="Scroll recently added right"
              className="
                absolute right-2 top-1/2 z-20
                hidden -translate-y-1/2
                items-center justify-center
                rounded-full
                border border-white/10
                bg-black/80
                p-2
                text-white
                shadow-xl
                backdrop-blur-md
                transition
                hover:scale-105
                hover:bg-black
                sm:flex
                opacity-0
                group-hover/carousel:opacity-100
              "
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
    </section>
  );
}

function MediaCard({
  item,
}: {
  item: RecentMedia;
}) {
  const href =
    item.type === "Movie"
      ? `/movies/${item.id}`
      : `/series/${item.id}`;

  return (
    <Link
      href={href}
      className="
        group relative
        w-[145px]
        shrink-0
        sm:w-[170px]
        lg:w-[190px]
      "
    >
      {/* Poster */}
      <div
        className="
          relative aspect-[2/3]
          overflow-hidden
          rounded-lg
          bg-zinc-900
          shadow-lg shadow-black/20
          transition-all
          duration-300
          group-hover:-translate-y-2
          group-hover:shadow-2xl
          group-hover:shadow-black/60
        "
      >
        <Image
          src={
            item.image ??
            FALLBACK_IMAGE
          }
          alt={item.title}
          fill
          sizes="
            (max-width: 640px) 145px,
            (max-width: 1024px) 170px,
            190px
          "
          className="
            object-cover
            transition-transform
            duration-500
            group-hover:scale-105
          "
        />

        {/* Gradient */}
        <div
          className="
            absolute inset-0
            bg-gradient-to-t
            from-black/90
            via-transparent
            to-transparent
            opacity-70
          "
        />

        {/* New badge */}
        <div
          className="
            absolute left-2 top-2
            flex items-center gap-1.5
            rounded-md
            bg-red-600
            px-2 py-1
            text-[9px]
            font-bold
            uppercase
            tracking-wide
            text-white
            shadow-lg
          "
        >
          <Clock className="h-3 w-3" />
          New
        </div>

        {/* Hover overlay */}
        <div
          className="
            absolute inset-0
            flex items-center justify-center
            bg-black/30
            opacity-0
            transition
            duration-300
            group-hover:opacity-100
          "
        >
          <div
            className="
              flex h-11 w-11
              scale-90
              items-center justify-center
              rounded-full
              bg-white
              text-black
              shadow-xl
              transition
              group-hover:scale-100
            "
          >
            <svg
              viewBox="0 0 24 24"
              className="ml-0.5 h-5 w-5 fill-current"
            >
              <path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l10.3-6.86a1.03 1.03 0 0 0 0-1.72L9.52 4.28A1 1 0 0 0 8 5.14Z" />
            </svg>
          </div>
        </div>

        {/* Bottom info */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-center gap-2 text-[10px] text-white/60">
            {item.year && (
              <span>{item.year}</span>
            )}

            {item.year && (
              <span className="h-1 w-1 rounded-full bg-white/40" />
            )}

            <span>{item.type}</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="mt-3">
        <h3
          className="
            truncate
            text-sm font-semibold
            text-white
          "
        >
          {item.title}
        </h3>

        <div className="mt-1 flex items-center gap-2 text-[11px] text-white/40">
          {item.rating && (
            <>
              <span>
                ★ {item.rating}
              </span>

              <span className="h-1 w-1 rounded-full bg-white/20" />
            </>
          )}

          <span>{item.added}</span>
        </div>
      </div>
    </Link>
  );
}

function formatAddedDate(
  createdAt: string,
): string {
  const created = new Date(createdAt);
  const now = new Date();

  const diffMs =
    now.getTime() -
    created.getTime();

  const diffMinutes = Math.floor(
    diffMs / (1000 * 60),
  );

  const diffHours = Math.floor(
    diffMs / (1000 * 60 * 60),
  );

  const diffDays = Math.floor(
    diffMs / (1000 * 60 * 60 * 24),
  );

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return created.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}

