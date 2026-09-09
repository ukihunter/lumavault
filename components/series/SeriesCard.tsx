
import Image from "next/image";
import Link from "next/link";

export type SeriesCardData = {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
  poster: string | null;
  backdrop: string | null;
  voteAverage: number | null;
  seasons: {
    id: string;
    number: number;
    title: string | null;
    _count: {
      episodes: number;
    };
  }[];
};

type SeriesCardProps = {
  series: SeriesCardData;
};

export function SeriesCard({ series }: SeriesCardProps) {
  const seasonCount = series.seasons.length;

  const episodeCount = series.seasons.reduce(
    (total, season) => total + season._count.episodes,
    0
  );

  return (
    <Link
      href={`/series/${series.id}`}
      className="group block overflow-hidden rounded-xl bg-zinc-900 transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-800"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-zinc-800">
        {series.poster ? (
          <Image
            src={series.poster}
            alt={series.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-zinc-800 px-4 text-center text-sm text-zinc-500">
            No poster available
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

        {series.voteAverage !== null && series.voteAverage > 0 && (
          <div className="absolute right-3 top-3 rounded-md bg-black/75 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            ★ {series.voteAverage.toFixed(1)}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="line-clamp-2 text-sm font-semibold text-white">
            {series.title}
          </h3>

          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-300">
            {series.year && <span>{series.year}</span>}

            {series.year && seasonCount > 0 && (
              <span className="text-zinc-500">•</span>
            )}

            {seasonCount > 0 && (
              <span>
                {seasonCount} {seasonCount === 1 ? "Season" : "Seasons"}
              </span>
            )}
          </div>

          {episodeCount > 0 && (
            <div className="mt-1 text-xs text-zinc-400">
              {episodeCount} {episodeCount === 1 ? "Episode" : "Episodes"}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
