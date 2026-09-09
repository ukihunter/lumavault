
import { MovieCard } from "@/components/movie/MovieCard";

import type { MovieCardMovie } from "@/components/movie/MovieCard";

export function MovieGrid({
  movies,
}: {
  movies: MovieCardMovie[];
}) {
  if (movies.length === 0) {
    return (
      <div
        className="
          rounded-2xl
          border border-white/5
          bg-white/[0.02]
          px-6 py-16
          text-center
        "
      >
        <h3 className="text-lg font-semibold text-white">
          No movies found
        </h3>

        <p className="mt-2 text-sm text-white/40">
          Scan a movie library to add movies to LumaVault.
        </p>
      </div>
    );
  }

  return (
    <div
      className="
        grid
        grid-cols-2
        gap-x-4
        gap-y-8
        sm:grid-cols-3
        sm:gap-x-5
        lg:grid-cols-5
        xl:grid-cols-6
        2xl:grid-cols-7
      "
    >
      {movies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={movie}
        />
      ))}
    </div>
  );
}
