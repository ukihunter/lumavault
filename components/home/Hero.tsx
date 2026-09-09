"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Play,
  Plus,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type TmdbSeries = {
  id: number;
  name: string;
  overview: string;
  first_air_date?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  vote_average?: number;
};

const TMDB_TOKEN = process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN;

const FEATURED_SERIES = [
  "Ben 10",
  "Ben 10 Alien Force",
  "Ben 10 Ultimate Alien",
  "Ben 10 Omniverse",
];

const ROTATION_INTERVAL = 8000;

export function Hero() {
  const [slides, setSlides] = useState<TmdbSeries[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [loading, setLoading] = useState(true);

  const activeSlide = slides[activeIndex];

  /*
   * Load featured titles from TMDB.
   *
   * NOTE:
   * For this temporary test version, the token is exposed through
   * NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN.
   *
   * Once this works correctly, move this request to the server
   * and keep the TMDB token private.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadSlides() {
      try {
        setLoading(true);

        const results: TmdbSeries[] = [];

        for (const title of FEATURED_SERIES) {
          try {
            const response = await fetch(
              `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(
                title,
              )}&language=en-US&page=1`,
              {
                headers: {
                  Authorization: `Bearer ${TMDB_TOKEN}`,
                  Accept: "application/json",
                },
              },
            );

            if (!response.ok) {
              console.error(
                `TMDB request failed for ${title}:`,
                response.status,
              );
              continue;
            }

            const data = await response.json();

            const match = data.results?.find(
              (item: TmdbSeries) =>
                item.backdrop_path &&
                item.poster_path &&
                item.name?.toLowerCase() === title.toLowerCase(),
            );

            if (match) {
              results.push(match);
            } else if (data.results?.[0]) {
              const fallback = data.results[0];

              if (fallback.backdrop_path) {
                results.push(fallback);
              }
            }
          } catch (error) {
            console.error(`Failed to load ${title}:`, error);
          }
        }

        if (!cancelled) {
          setSlides(results);
          setActiveIndex(0);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load TMDB hero:", error);

        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (TMDB_TOKEN) {
      loadSlides();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Automatically move to the next slide.
   */
  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, ROTATION_INTERVAL);

    return () => {
      window.clearInterval(timer);
    };
  }, [slides.length]);

  const goNext = useCallback(() => {
    if (slides.length === 0) {
      return;
    }

    setActiveIndex((current) => (current + 1) % slides.length);
  }, [slides.length]);

  const goPrevious = useCallback(() => {
    if (slides.length === 0) {
      return;
    }

    setActiveIndex(
      (current) => (current - 1 + slides.length) % slides.length,
    );
  }, [slides.length]);

  /*
   * Missing TMDB token.
   */
  if (!TMDB_TOKEN) {
    return (
      <section className="flex min-h-[680px] items-center justify-center bg-black text-white sm:min-h-[720px] lg:min-h-[760px]">
        <p className="text-sm text-red-400">
          TMDB API token is missing.
        </p>
      </section>
    );
  }

  /*
   * Loading state.
   */
  if (loading) {
    return (
      <section className="relative min-h-[680px] w-full overflow-hidden bg-black sm:min-h-[720px] lg:min-h-[760px]">
        <div className="absolute inset-0 animate-pulse bg-zinc-900" />

        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />

        <div className="relative z-10 flex min-h-[680px] items-end sm:min-h-[720px] lg:min-h-[760px]">
          <div className="w-full px-5 pb-28 sm:px-8 sm:pb-32 lg:max-w-3xl lg:px-12 lg:pb-36">
            <div className="h-4 w-48 rounded bg-white/10" />

            <div className="mt-5 h-16 w-96 max-w-full rounded bg-white/10" />

            <div className="mt-5 h-5 w-72 rounded bg-white/10" />

            <div className="mt-5 h-20 max-w-2xl rounded bg-white/10" />

            <div className="mt-8 flex gap-3">
              <div className="h-12 w-32 rounded bg-white/10" />
              <div className="h-12 w-32 rounded bg-white/10" />
              <div className="h-12 w-32 rounded bg-white/10" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  /*
   * No TMDB results.
   */
  if (!activeSlide) {
    return (
      <section className="flex min-h-[680px] items-center justify-center bg-black text-white sm:min-h-[720px] lg:min-h-[760px]">
        <p className="text-sm text-white/50">
          No featured titles found.
        </p>
      </section>
    );
  }

  const backdrop = activeSlide.backdrop_path
    ? `https://image.tmdb.org/t/p/original${activeSlide.backdrop_path}`
    : null;

  const poster = activeSlide.poster_path
    ? `https://image.tmdb.org/t/p/w500${activeSlide.poster_path}`
    : null;

  const year = activeSlide.first_air_date?.slice(0, 4);

  return (
    <section className="relative min-h-[680px] w-full overflow-hidden bg-black sm:min-h-[720px] lg:min-h-[760px]">
      {/*
       * BACKDROP
       */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => {
          if (!slide.backdrop_path) {
            return null;
          }

          const imageUrl = `https://image.tmdb.org/t/p/original${slide.backdrop_path}`;

          return (
            <div
              key={`${slide.id}-${index}`}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === activeIndex
                  ? "opacity-100"
                  : "opacity-0"
              }`}
            >
              <Image
                src={imageUrl}
                alt=""
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
          );
        })}

        {/* Left cinematic gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-transparent" />

        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-black via-black/80 to-transparent" />

        {/* Top fade */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />

        {/* Overall subtle dark overlay */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/*
       * CONTENT
       */}
      <div className="relative z-10 flex min-h-[680px] items-end sm:min-h-[720px] lg:min-h-[760px]">
        <div
          key={activeSlide.id}
          className="
            w-full
            animate-[heroContent_700ms_ease-out]
            px-5
            pb-28
            sm:px-8
            sm:pb-32
            lg:max-w-4xl
            lg:px-12
            lg:pb-36
          "
        >
          {/* Metadata */}
          <div className="mb-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-white/70 sm:text-sm">
            <span className="font-bold text-red-500">
              LumaVault
            </span>

            <span className="h-1 w-1 rounded-full bg-white/40" />

            {year && <span>{year}</span>}

            <span className="h-1 w-1 rounded-full bg-white/40" />

            <span className="rounded border border-white/30 px-1.5 py-0.5 text-[10px] font-bold">
              HD
            </span>

            <span className="h-1 w-1 rounded-full bg-white/40" />

            <span>Series</span>

            {activeSlide.vote_average &&
              activeSlide.vote_average > 0 && (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/40" />

                  <span className="text-yellow-400">
                    ★ {activeSlide.vote_average.toFixed(1)}
                  </span>
                </>
              )}
          </div>

          {/* Title */}
          <h1
            className="
              max-w-4xl
              text-5xl
              font-black
              tracking-tight
              text-white
              sm:text-6xl
              lg:text-7xl
          "
          >
            {activeSlide.name}
          </h1>

          {/* Description */}
          {activeSlide.overview && (
            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
              {activeSlide.overview}
            </p>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/series"
              className="
                inline-flex
                h-12
                items-center
                gap-2
                rounded-md
                bg-white
                px-6
                text-sm
                font-bold
                text-black
                transition
                hover:bg-white/85
                sm:px-8
              "
            >
              <Play className="h-5 w-5 fill-current" />
              Play
            </Link>

            <button
              type="button"
              className="
                inline-flex
                h-12
                items-center
                gap-2
                rounded-md
                bg-white/15
                px-6
                text-sm
                font-bold
                text-white
                backdrop-blur-sm
                transition
                hover:bg-white/25
                sm:px-8
              "
            >
              <Plus className="h-5 w-5" />
              My List
            </button>

            <Link
              href="/series"
              className="
                inline-flex
                h-12
                items-center
                gap-2
                rounded-md
                bg-white/10
                px-5
                text-sm
                font-semibold
                text-white
                backdrop-blur-sm
                transition
                hover:bg-white/20
              "
            >
              <Info className="h-5 w-5" />
              More Info
            </Link>
          </div>
        </div>
      </div>

      {/*
       * PREVIOUS / NEXT
       */}
      {slides.length > 1 && (
        <div className="absolute right-5 bottom-28 z-20 flex items-center gap-2 sm:right-8 sm:bottom-32">
          <button
            type="button"
            onClick={goPrevious}
            aria-label="Previous featured title"
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              border
              border-white/20
              bg-black/30
              text-white
              backdrop-blur-md
              transition
              hover:bg-white/15
            "
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={goNext}
            aria-label="Next featured title"
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              border
              border-white/20
              bg-black/30
              text-white
              backdrop-blur-md
              transition
              hover:bg-white/15
            "
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/*
       * SLIDE INDICATORS
       */}
      {slides.length > 1 && (
        <div className="absolute right-5 bottom-16 z-20 flex items-center gap-2 sm:right-8 sm:bottom-20">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show ${slide.name}`}
              className={`
                h-1
                rounded-full
                transition-all
                duration-500
                ${
                  index === activeIndex
                    ? "w-8 bg-white"
                    : "w-4 bg-white/30 hover:bg-white/60"
                }
              `}
            />
          ))}
        </div>
      )}

      {/*
       * VOLUME BUTTON
       */}
      <button
        type="button"
        onClick={() => setMuted((value) => !value)}
        aria-label={muted ? "Unmute" : "Mute"}
        className="
          absolute
          right-5
          bottom-5
          z-20
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-full
          border
          border-white/20
          bg-black/30
          text-white
          backdrop-blur-md
          transition
          hover:bg-white/15
          sm:right-8
        "
      >
        {muted ? (
          <VolumeX className="h-5 w-5" />
        ) : (
          <Volume2 className="h-5 w-5" />
        )}
      </button>

      {/* Rating */}
      <div className="absolute right-0 bottom-0 z-20 hidden rounded-l border-l border-t border-white/20 bg-black/40 px-4 py-2 text-xs font-semibold text-white/70 backdrop-blur-md sm:block">
        {muted ? "Muted" : "Sound On"}
      </div>
    </section>
  );
}