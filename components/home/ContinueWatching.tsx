"use client";

import Link from "next/link";
import { Play, X } from "lucide-react";

type ContinueItem = {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  progress: number;
  duration: string;
  remaining: string;
};

const continueWatching: ContinueItem[] = [
  {
    id: 1,
    title: "Ben 10",
    subtitle: "S01 E03 • The Krakken",
    image:
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80",
    progress: 68,
    duration: "22 min",
    remaining: "7 min left",
  },
  {
    id: 2,
    title: "Stranger Things",
    subtitle: "S04 E04 • Chapter Four",
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
    progress: 42,
    duration: "58 min",
    remaining: "34 min left",
  },
  {
    id: 3,
    title: "The Dark Knight",
    subtitle: "Movie",
    image:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80",
    progress: 31,
    duration: "2h 32m",
    remaining: "1h 44m left",
  },
  {
    id: 4,
    title: "Adventure Time",
    subtitle: "S05 E12 • Vault",
    image:
      "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&w=1200&q=80",
    progress: 76,
    duration: "11 min",
    remaining: "3 min left",
  },
  {
    id: 5,
    title: "The Mandalorian",
    subtitle: "S03 E02 • The Mines",
    image:
      "https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?auto=format&fit=crop&w=1200&q=80",
    progress: 54,
    duration: "42 min",
    remaining: "19 min left",
  },
];

export function ContinueWatching() {
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
            hidden text-sm font-medium
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
          -mx-4 flex gap-4 overflow-x-auto px-4 pb-4
          scrollbar-none
          sm:-mx-6 sm:px-6
          lg:-mx-10 lg:px-10
        "
      >
        {continueWatching.map((item) => (
          <ContinueCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function ContinueCard({ item }: { item: ContinueItem }) {
  return (
    <article
      className="
        group relative
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
        className="relative block aspect-video overflow-hidden"
      >
        <img
          src={item.image}
          alt={item.title}
          className="
            h-full w-full
            object-cover
            transition duration-500
            group-hover:scale-105
          "
        />

        {/* Dark overlay */}
        <div
          className="
            absolute inset-0
            bg-gradient-to-t
            from-black/80
            via-transparent
            to-black/10
          "
        />

        {/* Play button */}
        <div
          className="
            absolute inset-0
            flex items-center justify-center
            opacity-0
            transition
            duration-300
            group-hover:opacity-100
          "
        >
          <div
            className="
              flex h-12 w-12
              items-center justify-center
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

        {/* Remaining time */}
        <span
          className="
            absolute bottom-3 left-3
            rounded-md
            bg-black/70
            px-2 py-1
            text-[10px] font-medium
            text-white/80
            backdrop-blur-sm
          "
        >
          {item.remaining}
        </span>

        {/* Remove */}
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
          }}
          className="
            absolute right-3 top-3
            flex h-8 w-8
            items-center justify-center
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
        <div
          className="h-full bg-red-600 transition-all duration-500"
          style={{ width: `${item.progress}%` }}
        />
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