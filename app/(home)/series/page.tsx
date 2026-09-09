
import { SeriesGrid } from "@/components/series/SeriesGrid";

export default function SeriesPage() {
  return (
    <main className="min-h-screen bg-black px-4 pb-16 pt-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-500">
            LumaVault
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            TV Series
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
            Browse your complete TV series collection.
          </p>
        </div>

        <SeriesGrid />
      </div>
    </main>
  );
}

