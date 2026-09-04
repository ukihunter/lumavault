"use client";

import Link from "next/link";
import {
  Play,
  Plus,
  Info,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useState } from "react";

export function Hero() {
  const [muted, setMuted] = useState(true);

  return (
    <section className="relative min-h-[680px] w-full overflow-hidden bg-black sm:min-h-[720px] lg:min-h-[760px]">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=2400&q=85"
          alt=""
          className="h-full w-full object-cover"
        />

        {/* Left cinematic gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />

        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black via-black/70 to-transparent" />

        {/* Top fade */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-[680px] items-end sm:min-h-[720px] lg:min-h-[760px]">
        <div className="w-full px-5 pb-28 sm:px-8 sm:pb-32 lg:max-w-3xl lg:px-12 lg:pb-36">
          {/* Metadata */}
          <div className="mb-5 flex items-center gap-3 text-xs font-semibold text-white/70 sm:text-sm">
            <span className="text-red-500">LumaVault Original</span>

            <span className="h-1 w-1 rounded-full bg-white/40" />

            <span>2026</span>

            <span className="h-1 w-1 rounded-full bg-white/40" />

            <span className="rounded border border-white/30 px-1.5 py-0.5 text-[10px]">
              HD
            </span>

            <span className="h-1 w-1 rounded-full bg-white/40" />

            <span>Series</span>
          </div>

          {/* Title */}
          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
            Ben 10
          </h1>

          {/* Subtitle */}
          <p className="mt-3 text-lg font-semibold text-white/90 sm:text-xl">
            It&apos;s Hero Time!
          </p>

          {/* Description */}
          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/65 sm:text-base sm:leading-7">
            Young Ben Tennyson discovers a mysterious alien device that gives
            him the power to transform into incredible alien heroes. With new
            abilities and new challenges around every corner, the adventure is
            only beginning.
          </p>

          {/* Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/watch"
              className="
                inline-flex h-12 items-center gap-2
                rounded-md
                bg-white
                px-6
                text-sm font-bold
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
                inline-flex h-12 items-center gap-2
                rounded-md
                bg-white/15
                px-6
                text-sm font-bold
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

            <button
              type="button"
              className="
                inline-flex h-12 items-center gap-2
                rounded-md
                bg-white/10
                px-5
                text-sm font-semibold
                text-white
                backdrop-blur-sm
                transition
                hover:bg-white/20
              "
            >
              <Info className="h-5 w-5" />
              More Info
            </button>
          </div>
        </div>
      </div>

      {/* Volume control */}
      <button
        type="button"
        onClick={() => setMuted((value) => !value)}
        className="
          absolute bottom-28 right-5 z-20
          flex h-10 w-10 items-center justify-center
          rounded-full
          border border-white/20
          bg-black/30
          text-white
          backdrop-blur-md
          transition
          hover:bg-white/15
          sm:bottom-32 sm:right-8
          lg:bottom-36 lg:right-12
        "
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>

      {/* Rating / age indicator */}
      <div className="absolute bottom-28 right-0 hidden border-l border-white/30 bg-black/30 px-5 py-2 text-xs text-white/70 backdrop-blur-md sm:block lg:bottom-36">
        13+
      </div>
    </section>
  );
}