"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MediaItem = {
  id: string;
  title: string;
  type: "movie" | "series";
  year: number | null;
  rating: number | null;
  image: string | null;
};

type MovieApiItem = {
  id: string;
  title: string;
  year: number | null;
  poster: string | null;
  backdrop: string | null;
};

type SeriesApiItem = {
  id: string;
  title: string;
  year: number | null;
  poster: string | null;
  backdrop: string | null;
};

type MediaRowProps = {
  title: string;
  subtitle?: string;
  type?: "movie" | "series";
};

export function MediaRow({
  title,
  subtitle,
  type,
}: MediaRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const scroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;

    const amount = rowRef.current.clientWidth * 0.8;

    rowRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    let cancelled = false;

    async function loadMedia() {
      try {
        setLoading(true);

        const endpoint =
          type === "movie"
            ? "/api/movies"
            : type === "series"
              ? "/api/series"
              : null;

        if (!endpoint) {
          setItems([]);
          return;
        }

        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error(`Failed to load ${type}`);
        }

        const data = await response.json();

        if (cancelled) return;

        if (type === "movie") {
          const movies: MovieApiItem[] = data.movies ?? [];

          setItems(
            movies.map((movie) => ({
              id: movie.id,
              title: movie.title,
              type: "movie",
              year: movie.year,
              rating: null,
              image: movie.poster || movie.backdrop,
            })),
          );
        } else {
          const series: SeriesApiItem[] = data.series ?? [];

          setItems(
            series.map((show) => ({
              id: show.id,
              title: show.title,
              type: "series",
              year: show.year,
              rating: null,
              image: show.poster || show.backdrop,
            })),
          );
        }
      } catch (error) {
        console.error("MediaRow error:", error);

        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMedia();

    return () => {
      cancelled = true;
    };
  }, [type]);

  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <section className="group/row relative">
      {/* Header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {title}
            </h2>

            <Link
              href="/library"
              className="
                hidden items-center gap-1
                text-xs font-medium
                text-white/30
                transition
                hover:text-white
                sm:flex
              "
            >
              Explore
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {subtitle && (
            <p className="mt-1 text-xs text-white/35 sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Left button */}
      <button
        type="button"
        onClick={() => scroll("left")}
        className="
          absolute
          left-2
          top-1/2
          z-20
          hidden
          h-11
          w-11
          -translate-y-1/2
          items-center
          justify-center
          rounded-full
          border border-white/10
          bg-black/70
          text-white
          opacity-0
          shadow-xl
          backdrop-blur-md
          transition-all
          duration-200
          hover:bg-white
          hover:text-black
          group-hover/row:opacity-100
          lg:flex
        "
        aria-label={`Scroll ${title} left`}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Cards */}
      <div
        ref={rowRef}
        className="
          flex
          gap-4
          overflow-x-auto
          scroll-smooth
          pb-5
          scrollbar-none
          sm:gap-5
        "
      >
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <MediaCardSkeleton key={index} />
            ))
          : items.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
      </div>

      {/* Right button */}
      <button
        type="button"
        onClick={() => scroll("right")}
        className="
          absolute
          right-2
          top-1/2
          z-20
          hidden
          h-11
          w-11
          -translate-y-1/2
          items-center
          justify-center
          rounded-full
          border border-white/10
          bg-black/70
          text-white
          opacity-0
          shadow-xl
          backdrop-blur-md
          transition-all
          duration-200
          hover:bg-white
          hover:text-black
          group-hover/row:opacity-100
          lg:flex
        "
        aria-label={`Scroll ${title} right`}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </section>
  );
}

function MediaCard({ item }: { item: MediaItem }) {
  const href =
    item.type === "movie"
      ? `/movies/${item.id}`
      : `/series/${item.id}`;

  return (
    <Link
      href={href}
      className="
        group
        relative
        w-[150px]
        shrink-0
        sm:w-[175px]
        lg:w-[190px]
        xl:w-[205px]
      "
    >
      {/* Poster */}
      <div
        className="
          relative
          aspect-[2/3]
          overflow-hidden
          rounded-lg
          bg-zinc-900
          shadow-lg
          shadow-black/20
          transition-all
          duration-300
          group-hover:-translate-y-2
          group-hover:shadow-2xl
          group-hover:shadow-black/60
        "
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.title}
            fill
            sizes="
              (max-width: 640px) 150px,
              (max-width: 1024px) 175px,
              190px
            "
            className="
              object-cover
              transition-transform
              duration-500
              group-hover:scale-105
            "
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 px-4 text-center">
            <span className="text-sm font-medium text-white/30">
              {item.title}
            </span>
          </div>
        )}

        {/* Overlay */}
        <div
          className="
            absolute
            inset-0
            bg-gradient-to-t
            from-black/90
            via-black/10
            to-transparent
          "
        />

        {/* Hover play */}
        <div
          className="
            absolute
            inset-0
            flex
            items-center
            justify-center
            bg-black/20
            opacity-0
            transition-opacity
            duration-300
            group-hover:opacity-100
          "
        >
          <div
            className="
              flex
              h-11
              w-11
              scale-90
              items-center
              justify-center
              rounded-full
              bg-white
              text-black
              shadow-2xl
              transition-transform
              duration-300
              group-hover:scale-100
            "
          >
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </div>
        </div>

        {/* Type */}
        <div
          className="
            absolute
            left-2
            top-2
            rounded
            border
            border-white/10
            bg-black/60
            px-2
            py-1
            text-[9px]
            font-semibold
            uppercase
            tracking-wider
            text-white/80
            backdrop-blur-sm
          "
        >
          {item.type}
        </div>

        {/* Bottom metadata */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-center gap-2 text-[10px] text-white/60">
            {item.year && <span>{item.year}</span>}

            {item.year && item.rating !== null && (
              <span className="h-1 w-1 rounded-full bg-white/40" />
            )}

            {item.rating !== null && (
              <span className="flex items-center gap-1">
                <Star className="h-2.5 w-2.5 fill-current" />
                {item.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <h3
        className="
          mt-3
          truncate
          text-sm
          font-semibold
          text-white/90
          transition-colors
          group-hover:text-white
        "
      >
        {item.title}
      </h3>
    </Link>
  );
}

function MediaCardSkeleton() {
  return (
    <div
      className="
        w-[150px]
        shrink-0
        sm:w-[175px]
        lg:w-[190px]
        xl:w-[205px]
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

      <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-zinc-900" />
    </div>
  );
}