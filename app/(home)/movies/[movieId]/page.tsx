
import { notFound } from "next/navigation";

import { MovieDetails } from "@/components/movie/MovieDetails";
import { prisma } from "@/lib/db/prisma";

type PageProps = {
  params: Promise<{
    movieId: string;
  }>;
};

export default async function MovieDetailsPage({
  params,
}: PageProps) {
  const { movieId } = await params;

  const movie =
    await prisma.movie.findUnique({
      where: {
        id: movieId,
      },

      select: {
        id: true,
        title: true,
        description: true,
        overview: true,
        year: true,
        poster: true,
        backdrop: true,
        voteAverage: true,
        duration: true,

        library: {
          select: {
            id: true,
            name: true,
            path: true,
            type: true,
          },
        },

        mediaSource: {
          select: {
            id: true,
            type: true,
            filePath: true,
            archivePath: true,
            entryPath: true,
          },
        },
      },
    });

  if (!movie) {
    notFound();
  }

  return (
    <MovieDetails
      movie={movie}
    />
  );
}

