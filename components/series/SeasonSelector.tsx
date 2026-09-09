
"use client";

type Season = {
  id: string;
  number: number;
  title: string | null;
  episodes: unknown[];
};

type SeasonSelectorProps = {
  seasons: Season[];
  selectedSeasonId: string | null;
  onSeasonChange: (seasonId: string) => void;
};

export function SeasonSelector({
  seasons,
  selectedSeasonId,
  onSeasonChange,
}: SeasonSelectorProps) {
  if (seasons.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {seasons.map((season) => {
        const selected = season.id === selectedSeasonId;

        return (
          <button
            key={season.id}
            type="button"
            onClick={() => onSeasonChange(season.id)}
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              selected
                ? "bg-white text-black"
                : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white",
            ].join(" ")}
          >
            {season.title || `Season ${season.number}`}
          </button>
        );
      })}
    </div>
  );
}

