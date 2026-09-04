"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useRef } from "react";

type MediaItem = {
  id: string;
  title: string;
  type: "movie" | "series";
  year: number;
  rating: number;
  image: string;
};

type MediaRowProps = {
  title: string;
  subtitle?: string;
  items?: MediaItem[];
};

const defaultItems: MediaItem[] = [
  {
    id: "movie-1",
    title: "Interstellar",
    type: "movie",
    year: 2014,
    rating: 8.7,
    image:
      "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "movie-2",
    title: "The Dark Knight",
    type: "movie",
    year: 2008,
    rating: 9.0,
    image:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "movie-3",
    title: "Inception",
    type: "movie",
    year: 2010,
    rating: 8.8,
    image:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "series-1",
    title: "Ben 10",
    type: "series",
    year: 2005,
    rating: 8.1,
    image:
      "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "series-2",
    title: "The Mandalorian",
    type: "series",
    year: 2019,
    rating: 8.6,
    image:
      "https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "series-3",
    title: "Stranger Things",
    type: "series",
    year: 2016,
    rating: 8.7,
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80",
  },
];

export function MediaRow({
  title,
  subtitle,
  items = defaultItems,
}: MediaRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;

    const amount = rowRef.current.clientWidth * 0.8;

    rowRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

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
        {items.map((item) => (
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
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="
            h-full
            w-full
            object-cover
            transition-transform
            duration-500
            group-hover:scale-105
          "
        />

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

        {/* Hover play button */}
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
              items-center
              justify-center
              rounded-full
              bg-white
              text-black
              shadow-2xl
              transition-transform
              duration-300
              group-hover:scale-100
              scale-90
            "
          >
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </div>
        </div>

        {/* Type badge */}
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
            <span>{item.year}</span>

            <span className="h-1 w-1 rounded-full bg-white/40" />

            <span>★ {item.rating}</span>
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