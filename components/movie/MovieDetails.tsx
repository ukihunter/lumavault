
"use client";

import Image from "next/image";
import Link from "next/link";

import { MovieVideoPlayer } from "@/components/player/MovieVideoPlayer";

import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Film,
  Star,
} from "lucide-react";

type MovieDetailsMovie = {
  id: string;
  title: string;
  description: string | null;
  overview: string | null;
  year: number | null;
  poster: string | null;
  backdrop: string | null;
  voteAverage: number | null;
  duration: number | null;

  library: {
    id: string;
    name: string;
    path: string;
    type: string;
  };

  mediaSource: {
    id: string;
    type: "FILE" | "ARCHIVE";
    filePath: string | null;
    archivePath: string | null;
    entryPath: string | null;
  } | null;
};

export function MovieDetails({
  movie,
}: {
  movie: MovieDetailsMovie;
}) {
  const description =
    movie.overview ||
    movie.description ||
    "No description available.";

  return (
    <main className="min-h-screen bg-black">
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}

      <section className="relative min-h-[600px] overflow-hidden">
        {/* Backdrop */}
        {movie.backdrop ? (
          <Image
            src={movie.backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div
            className="
              absolute inset-0
              bg-gradient-to-br
              from-zinc-900
              to-black
            "
          />
        )}

        {/* Overall dark overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Left-to-right gradient */}
        <div
          className="
            absolute inset-0
            bg-gradient-to-r
            from-black
            via-black/75
            to-black/20
          "
        />

        {/* Bottom fade */}
        <div
          className="
            absolute inset-x-0 bottom-0
            h-80
            bg-gradient-to-t
            from-black
            via-black/70
            to-transparent
          "
        />

        {/* Hero content */}
        <div
          className="
            relative z-10
            mx-auto
            flex min-h-[600px]
            max-w-[1600px]
            items-end
            px-4
            pb-16
            pt-28
            sm:px-6
            lg:px-10
            xl:px-14
          "
        >
          <div
            className="
              flex w-full
              flex-col
              gap-8
              lg:flex-row
              lg:items-end
              lg:gap-10
            "
          >
            {/* Poster */}
            <div
              className="
                relative
                hidden
                w-[220px]
                shrink-0
                overflow-hidden
                rounded-xl
                bg-zinc-900
                shadow-2xl
                lg:block
              "
            >
              <div className="relative aspect-[2/3]">
                {movie.poster ? (
                  <Image
                    src={movie.poster}
                    alt={movie.title}
                    fill
                    sizes="220px"
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="
                      flex h-full
                      items-center
                      justify-center
                      px-4
                      text-center
                      text-sm
                      text-white/40
                    "
                  >
                    {movie.title}
                  </div>
                )}
              </div>
            </div>

            {/* Information */}
            <div className="max-w-4xl">
              {/* Back */}
              <Link
                href="/movies"
                className="
                  mb-6
                  inline-flex
                  items-center
                  gap-2
                  text-sm
                  text-white/50
                  transition
                  hover:text-white
                "
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Movies
              </Link>

              {/* Title */}
              <h1
                className="
                  text-4xl
                  font-bold
                  tracking-tight
                  text-white
                  sm:text-5xl
                  lg:text-6xl
                "
              >
                {movie.title}
              </h1>

              {/* Metadata */}
              <div
                className="
                  mt-5
                  flex
                  flex-wrap
                  items-center
                  gap-x-5
                  gap-y-2
                  text-sm
                  text-white/60
                "
              >
                {movie.year && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {movie.year}
                  </span>
                )}

                {movie.voteAverage !== null && (
                  <span className="flex items-center gap-1.5 text-white">
                    <Star className="h-4 w-4 fill-current text-yellow-400" />
                    {movie.voteAverage.toFixed(1)}
                  </span>
                )}

                {movie.duration !== null && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {formatDuration(
                      movie.duration,
                    )}
                  </span>
                )}

                <span className="flex items-center gap-1.5">
                  <Film className="h-4 w-4" />
                  Movie
                </span>
              </div>

              {/* Description */}
              <p
                className="
                  mt-6
                  max-w-3xl
                  text-sm
                  leading-7
                  text-white/65
                  sm:text-base
                "
              >
                {description}
              </p>

              {/* Source information */}
              <div className="mt-7 flex flex-wrap gap-3">
                <div
                  className="
                    rounded-lg
                    border border-white/10
                    bg-white/5
                    px-3 py-2
                    text-xs
                    text-white/50
                    backdrop-blur-md
                  "
                >
                  Source:{" "}
                  <span className="text-white/80">
                    {movie.mediaSource?.type ??
                      "Unknown"}
                  </span>
                </div>

                <div
                  className="
                    rounded-lg
                    border border-white/10
                    bg-white/5
                    px-3 py-2
                    text-xs
                    text-white/50
                    backdrop-blur-md
                  "
                >
                  Library:{" "}
                  <span className="text-white/80">
                    {movie.library.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Wide Player                                                         */}
      {/* ------------------------------------------------------------------ */}

      <section
        className="
          mx-auto
          w-full
          max-w-[1800px]
          px-3
          py-8
          sm:px-5
          sm:py-10
          lg:px-8
          xl:px-12
        "
      >
        <div
          className="
            overflow-hidden
            rounded-2xl
            border
            border-white/5
            bg-zinc-950
            shadow-2xl
          "
        >
          <MovieVideoPlayer
            movieId={movie.id}
            title={movie.title}
            poster={movie.poster}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Additional information                                              */}
      {/* ------------------------------------------------------------------ */}

      <section
        className="
          mx-auto
          w-full
          max-w-[1800px]
          px-4
          pb-20
          sm:px-6
          lg:px-10
          xl:px-14
        "
      >
        <div
          className="
            border-t
            border-white/5
            pt-8
          "
        >
          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            {/* Description */}
            <div>
              <p
                className="
                  mb-2
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.2em]
                  text-red-500
                "
              >
                About this movie
              </p>

              <h2 className="text-xl font-semibold text-white">
                {movie.title}
              </h2>

              <p
                className="
                  mt-4
                  max-w-4xl
                  text-sm
                  leading-7
                  text-white/50
                "
              >
                {description}
              </p>
            </div>

            {/* Details */}
            <div
              className="
                rounded-xl
                border
                border-white/5
                bg-white/[0.02]
                p-5
              "
            >
              <h3 className="text-sm font-semibold text-white">
                Details
              </h3>

              <div className="mt-4 space-y-3 text-xs">
                {movie.year && (
                  <DetailRow
                    label="Year"
                    value={String(
                      movie.year,
                    )}
                  />
                )}

                {movie.voteAverage !==
                  null && (
                  <DetailRow
                    label="Rating"
                    value={`${movie.voteAverage.toFixed(
                      1,
                    )} / 10`}
                  />
                )}

                {movie.duration !==
                  null && (
                  <DetailRow
                    label="Duration"
                    value={formatDuration(
                      movie.duration,
                    )}
                  />
                )}

                <DetailRow
                  label="Source"
                  value={
                    movie.mediaSource?.type ??
                    "Unknown"
                  }
                />

                <DetailRow
                  label="Library"
                  value={
                    movie.library.name
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-4
        border-b
        border-white/5
        pb-3
        last:border-0
        last:pb-0
      "
    >
      <span className="text-white/35">
        {label}
      </span>

      <span className="text-right text-white/70">
        {value}
      </span>
    </div>
  );
}

function formatDuration(
  minutes: number,
): string {
  if (minutes <= 0) {
    return "Unknown";
  }

  const hours = Math.floor(
    minutes / 60,
  );

  const remaining =
    minutes % 60;

  if (hours === 0) {
    return `${remaining}m`;
  }

  if (remaining === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remaining}m`;
}

