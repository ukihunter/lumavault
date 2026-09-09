import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import VideoPlayer from "@/components/player/VideoPlayer";

type PageProps = {
  params: Promise<{
    episodeId: string;
  }>;
};

export default async function WatchPage({
  params,
}: PageProps) {
  const { episodeId } = await params;

  const episode = await prisma.episode.findUnique({
    where: {
      id: episodeId,
    },
    select: {
      id: true,
      number: true,
      title: true,
      description: true,
      duration: true,

      season: {
        select: {
          number: true,

          series: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },

      progress: {
        select: {
          position: true,
          completed: true,
        },
      },

      mediaSource: {
        select: {
          type: true,
        },
      },
    },
  });

  if (!episode || !episode.mediaSource) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-7xl">
        <VideoPlayer
          episodeId={episode.id}
          title={episode.title}
          seriesTitle={episode.season.series.title}
          seasonNumber={episode.season.number}
          episodeNumber={episode.number}
          description={episode.description}
          initialPosition={
            episode.progress?.position ?? 0
          }
          completed={
            episode.progress?.completed ?? false
          }
        />
      </div>
    </main>
  );
}