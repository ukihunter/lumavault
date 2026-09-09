
import Image from "next/image";
import Link from "next/link";

import { Star } from "lucide-react";

export type MovieCardMovie = {
  id: string;
  title: string;
  year: number | null;
  poster: string | null;
  backdrop: string | null;
  voteAverage: number | null;
};

export function MovieCard({
  movie,
}: {
  movie: MovieCardMovie;
}) {
  return (
    <Link
      href={`/movies/${movie.id}`}
      className="group block"
    >
      <div
        className="
          relative
          aspect-[2/3]
          overflow-hidden
          rounded-xl
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
        {movie.poster ? (
          <Image
            src={movie.poster}
            alt={movie.title}
            fill
            sizes="
              (max-width: 640px) 145px,
              (max-width: 1024px) 180px,
              220px
            "
            className="
              object-cover
              transition-transform
              duration-500
              group-hover:scale-105
            "
          />
        ) : (
          <div
            className="
              flex h-full w-full
              items-center justify-center
              bg-gradient-to-br
              from-zinc-900
              to-zinc-950
              px-4
              text-center
            "
          >
            <span className="text-sm font-medium text-white/40">
              {movie.title}
            </span>
          </div>
        )}

        {/* Gradient */}
        <div
          className="
            absolute inset-0
            bg-gradient-to-t
            from-black/90
            via-black/10
            to-transparent
            opacity-80
          "
        />

        {/* Hover overlay */}
        <div
          className="
            absolute inset-0
            flex items-center justify-center
            bg-black/20
            opacity-0
            transition
            duration-300
            group-hover:opacity-100
          "
        >
          <div
            className="
              flex h-12 w-12
              scale-90
              items-center justify-center
              rounded-full
              bg-white
              text-black
              shadow-2xl
              transition
              duration-300
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

        {/* Rating */}
        {movie.voteAverage !== null && (
          <div
            className="
              absolute right-2 top-2
              flex items-center gap-1
              rounded-md
              bg-black/70
              px-2 py-1
              text-[10px]
              font-semibold
              text-white
              backdrop-blur-md
            "
          >
            <Star className="h-3 w-3 fill-current text-yellow-400" />

            <span>
              {movie.voteAverage.toFixed(1)}
            </span>
          </div>
        )}

        {/* Bottom metadata */}
        <div
          className="
            absolute inset-x-0 bottom-0
            p-3
          "
        >
          <div className="flex items-center gap-2 text-[10px] text-white/60">
            {movie.year && (
              <>
                <span>{movie.year}</span>

                <span className="h-1 w-1 rounded-full bg-white/40" />
              </>
            )}

            <span>Movie</span>
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
            transition-colors
            group-hover:text-white
          "
        >
          {movie.title}
        </h3>
      </div>
    </Link>
  );
}

