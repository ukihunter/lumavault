
import { MovieGrid } from "@/components/movie/MovieGrid";

import { prisma } from "@/lib/db/prisma";

export default async function MoviesPage() {
  const movies =
    await prisma.movie.findMany({
      select: {
        id: true,
        title: true,
        year: true,
        poster: true,
        backdrop: true,
        voteAverage: true,
      },

      orderBy: [
        {
          createdAt: "desc",
        },
        {
          title: "asc",
        },
      ],
    });

  return (
    <main
      className="
        min-h-screen
        bg-black
        px-4
        pb-20
        pt-24
        sm:px-6
        lg:px-10
      "
    >
      {/* Header */}
      <div className="mb-8">
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
          Your collection
        </p>

        <div className="flex items-end justify-between gap-4">
          <div>
            <h1
              className="
                text-3xl
                font-bold
                tracking-tight
                text-white
                sm:text-4xl
              "
            >
              Movies
            </h1>

            <p className="mt-2 text-sm text-white/40">
              {movies.length}{" "}
              {movies.length === 1
                ? "movie"
                : "movies"}{" "}
              in your vault
            </p>
          </div>
        </div>
      </div>

      {/* Movie grid */}
      <MovieGrid
        movies={movies}
      />
    </main>
  );
}

