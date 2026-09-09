
"use client";

import {
  EpisodeCard,
  type EpisodeCardData,
} from "./EpisodeCard";

export type { EpisodeCardData } from "./EpisodeCard";

type EpisodeListProps = {
  episodes: EpisodeCardData[];
};

export function EpisodeList({
  episodes,
}: EpisodeListProps) {
  if (episodes.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center">
        <p className="text-sm text-zinc-500">
          No episodes found in this season.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {episodes.map((episode) => (
        <EpisodeCard
          key={episode.id}
          episode={episode}
        />
      ))}
    </div>
  );
}

