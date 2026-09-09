
import Image from "next/image";
import Link from "next/link";

export type EpisodeCardData = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  duration: number | null;
  mediaSource: {
    id: string;
    type: string;
    filePath: string | null;
    archivePath: string | null;
    entryPath: string | null;
  } | null;
  progress: {
    position: number;
    completed: boolean;
    updatedAt: string;
  } | null;
};

type EpisodeCardProps = {
  episode: EpisodeCardData;
};

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${remainingMinutes}m`;
}

function getProgressPercent(
  position: number,
  durationMinutes: number | null
) {
  if (!durationMinutes || durationMinutes <= 0 || position <= 0) {
    return 0;
  }

  const durationSeconds = durationMinutes * 60;

  return Math.min(
    100,
    Math.max(2, (position / durationSeconds) * 100)
  );
}

export function EpisodeCard({
  episode,
}: EpisodeCardProps) {
  const progressPercent = getProgressPercent(
    episode.progress?.position ?? 0,
    episode.duration
  );

  const duration = formatDuration(episode.duration);

  return (
    <Link
      href={`/watch/${episode.id}`}
      className="group block overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition hover:border-zinc-700 hover:bg-zinc-900"
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-zinc-900 sm:w-64">
          {episode.thumbnail ? (
            <Image
              src={episode.thumbnail}
              alt={episode.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="256px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-600">
              No thumbnail
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          <div className="absolute left-3 top-3 rounded-md bg-black/75 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
            E{String(episode.number).padStart(2, "0")}
          </div>

          {episode.progress && episode.progress.position > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div
                className="h-full bg-red-600"
                style={{
                  width:
                    progressPercent > 0
                      ? `${progressPercent}%`
                      : "2%",
                }}
              />
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-xl">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="ml-1"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Episode {episode.number}
              </p>

              <h3 className="mt-1 truncate text-base font-semibold text-white">
                {episode.title}
              </h3>
            </div>

            {duration && (
              <span className="shrink-0 text-xs text-zinc-500">
                {duration}
              </span>
            )}
          </div>

          {episode.description && (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">
              {episode.description}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
            {episode.progress?.position &&
            episode.progress.position > 0 ? (
              <span>
                Resume from{" "}
                {Math.floor(episode.progress.position / 60)}:
                {String(
                  Math.floor(episode.progress.position % 60)
                ).padStart(2, "0")}
              </span>
            ) : (
              <span>Not watched</span>
            )}

            {episode.mediaSource && (
              <>
                <span>•</span>
                <span>Available</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

