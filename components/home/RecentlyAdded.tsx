"use client";

import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";

type RecentMedia = {
  id: string;
  title: string;
  type: "Movie" | "Series";
  year: number;
  rating: string;
  image: string;
  added: string;
};

const recentlyAdded: RecentMedia[] = [
  {
    id: "1",
    title: "Ben 10",
    type: "Series",
    year: 2005,
    rating: "8.1",
    image:
      "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&w=900&q=80",
    added: "Today",
  },
  {
    id: "2",
    title: "The Dark Knight",
    type: "Movie",
    year: 2008,
    rating: "9.0",
    image:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80",
    added: "Today",
  },
  {
    id: "3",
    title: "Interstellar",
    type: "Movie",
    year: 2014,
    rating: "8.7",
    image:
      "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?auto=format&fit=crop&w=900&q=80",
    added: "Yesterday",
  },
  {
    id: "4",
    title: "The Mandalorian",
    type: "Series",
    year: 2019,
    rating: "8.6",
    image:
      "https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?auto=format&fit=crop&w=900&q=80",
    added: "2 days ago",
  },
  {
    id: "5",
    title: "Spider-Man",
    type: "Movie",
    year: 2021,
    rating: "8.2",
    image:
      "https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=900&q=80",
    added: "3 days ago",
  },
  {
    id: "6",
    title: "Stranger Things",
    type: "Series",
    year: 2016,
    rating: "8.7",
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80",
    added: "4 days ago",
  },
  {
    id: "7",
    title: "Inception",
    type: "Movie",
    year: 2010,
    rating: "8.8",
    image:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
    added: "5 days ago",
  },
];

export function RecentlyAdded() {
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

      {/* Media Row */}
      <div
        className="
          -mx-4 flex gap-4 overflow-x-auto px-4 pb-5
          scrollbar-none
          sm:-mx-6 sm:gap-5 sm:px-6
          lg:-mx-10 lg:px-10
        "
      >
        {recentlyAdded.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function MediaCard({ item }: { item: RecentMedia }) {
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
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="
            h-full w-full
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

        {/* Recently added badge */}
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
              items-center justify-center
              rounded-full
              bg-white
              text-black
              shadow-xl
              transition
              group-hover:scale-100
              scale-90
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

        {/* Bottom information */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-center gap-2 text-[10px] text-white/60">
            <span>{item.year}</span>

            <span className="h-1 w-1 rounded-full bg-white/40" />

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
            transition
            group-hover:text-white
          "
        >
          {item.title}
        </h3>

        <div className="mt-1 flex items-center gap-2 text-[11px] text-white/40">
          <span>★ {item.rating}</span>

          <span className="h-1 w-1 rounded-full bg-white/20" />

          <span>{item.added}</span>
        </div>
      </div>
    </Link>
  );
}