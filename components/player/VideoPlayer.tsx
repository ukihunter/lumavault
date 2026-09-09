"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type VideoPlayerProps = {
  episodeId: string;
  title: string;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  description: string | null;
  initialPosition: number;
  completed: boolean;
};

export default function VideoPlayer({
  episodeId,
  title,
  seriesTitle,
  seasonNumber,
  episodeNumber,
  description,
  initialPosition,
  completed: initialCompleted,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const lastSavedPositionRef =
    useRef(initialPosition);

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(
    null,
  );
  const [completed, setCompleted] =
    useState(initialCompleted);
  const [isSaving, setIsSaving] = useState(false);

  const saveProgress = useCallback(
    async (
      position: number,
      isCompleted: boolean,
    ) => {
      if (!Number.isFinite(position)) {
        return;
      }

      const roundedPosition = Math.floor(position);

      if (
        roundedPosition ===
          lastSavedPositionRef.current &&
        isCompleted === completed
      ) {
        return;
      }

      try {
        setIsSaving(true);

        const response = await fetch(
          "/api/progress",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              episodeId,
              position: roundedPosition,
              completed: isCompleted,
            }),
            keepalive: true,
          },
        );

        if (!response.ok) {
          throw new Error(
            "Failed to save progress",
          );
        }

        lastSavedPositionRef.current =
          roundedPosition;

        if (isCompleted) {
          setCompleted(true);
        }
      } catch (error) {
        console.error(
          "Failed to save playback progress:",
          error,
        );
      } finally {
        setIsSaving(false);
      }
    },
    [episodeId, completed],
  );

  const handleLoadedMetadata =
    useCallback(() => {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      console.log(
        "[LumaVault] Video metadata loaded",
        {
          duration: video.duration,
          initialPosition,
        },
      );

      if (
        initialPosition > 0 &&
        Number.isFinite(video.duration) &&
        initialPosition < video.duration - 2
      ) {
        video.currentTime = initialPosition;
      }

      setIsReady(true);
      setError(null);
    }, [initialPosition]);

  const handleCanPlay = useCallback(() => {
    console.log(
      "[LumaVault] Video can play",
    );

    setIsReady(true);
    setError(null);
  }, []);

  const handleVideoError =
    useCallback(() => {
      const video = videoRef.current;

      console.error(
        "[LumaVault] Video playback error",
        {
          error: video?.error,
          networkState: video?.networkState,
          readyState: video?.readyState,
        },
      );

      setError(
        "The video could not be loaded or played.",
      );
    }, []);

  const handlePause = useCallback(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    void saveProgress(
      video.currentTime,
      false,
    );
  }, [saveProgress]);

  const handleEnded = useCallback(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    void saveProgress(
      video.duration,
      true,
    );
  }, [saveProgress]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;

    if (
      !video ||
      !Number.isFinite(video.duration) ||
      video.duration <= 0
    ) {
      return;
    }

    if (
      video.currentTime >= video.duration * 0.9 &&
      !completed
    ) {
      void saveProgress(
        video.currentTime,
        true,
      );
    }
  }, [completed, saveProgress]);

  // Save progress every 10 seconds.
  useEffect(() => {
    const interval = window.setInterval(() => {
      const video = videoRef.current;

      if (
        !video ||
        video.paused ||
        video.ended
      ) {
        return;
      }

      void saveProgress(
        video.currentTime,
        false,
      );
    }, 10_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [saveProgress]);

  // Save progress when leaving the page.
  useEffect(() => {
    const saveBeforeLeaving = () => {
      const video = videoRef.current;

      if (
        !video ||
        !Number.isFinite(video.currentTime)
      ) {
        return;
      }

      const payload = JSON.stringify({
        episodeId,
        position: Math.floor(
          video.currentTime,
        ),
        completed,
      });

      navigator.sendBeacon(
        "/api/progress",
        new Blob([payload], {
          type: "application/json",
        }),
      );
    };

    window.addEventListener(
      "pagehide",
      saveBeforeLeaving,
    );

    return () => {
      window.removeEventListener(
        "pagehide",
        saveBeforeLeaving,
      );
    };
  }, [episodeId, completed]);

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Player */}
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          className="h-full w-full"
          controls
          playsInline
          preload="metadata"
          src={`/api/videos/${episodeId}`}
          onLoadedMetadata={
            handleLoadedMetadata
          }
          onCanPlay={handleCanPlay}
          onError={handleVideoError}
          onPause={handlePause}
          onEnded={handleEnded}
          onTimeUpdate={handleTimeUpdate}
        />

        {!isReady && !error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="rounded-lg bg-zinc-900/80 px-4 py-3 text-sm text-zinc-300">
              Loading video...
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center">
              <p className="text-sm text-red-400">
                {error}
              </p>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setIsReady(false);

                  const video =
                    videoRef.current;

                  if (video) {
                    video.load();
                  }
                }}
                className="mt-4 rounded-md bg-white px-4 py-2 text-sm font-medium text-black"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Episode information */}
      <section className="px-4 py-6 sm:px-6">
        <div className="text-sm text-zinc-400">
          {seriesTitle}{" "}
          <span className="mx-1">•</span>
          S
          {String(seasonNumber).padStart(
            2,
            "0",
          )}
          E
          {String(episodeNumber).padStart(
            2,
            "0",
          )}
        </div>

        <h1 className="mt-2 text-2xl font-semibold">
          {title}
        </h1>

        {description && (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            {description}
          </p>
        )}

        <div className="mt-4 flex gap-3 text-xs text-zinc-500">
          {initialPosition > 0 && (
            <span>
              Resume from{" "}
              {formatTime(initialPosition)}
            </span>
          )}

          {completed && (
            <span className="text-zinc-300">
              Completed
            </span>
          )}

          {isSaving && (
            <span>Saving...</span>
          )}
        </div>
      </section>
    </div>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const totalSeconds = Math.floor(seconds);

  const hours = Math.floor(
    totalSeconds / 3600,
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60,
  );

  const remainingSeconds =
    totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}