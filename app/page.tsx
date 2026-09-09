import { Hero } from "@/components/home/Hero";
import { ContinueWatching } from "@/components/home/ContinueWatching";
import { RecentlyAdded } from "@/components/home/RecentlyAdded";
import { MediaRow } from "@/components/home/MediaRow";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black">
      <Hero />

      <div className="relative z-10 space-y-12 px-4 pb-16 sm:px-6 lg:px-10">
        <ContinueWatching />

        <RecentlyAdded />

      <MediaRow
  title="Movies"
  subtitle="Your movie collection"
  type="movie"
/>

<MediaRow
  title="TV Series"
  subtitle="Your series collection"
  type="series"
/>
      </div>
    </main>
  );
}