"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Check,
  ChevronDown,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";

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

type AudioTrack = {
  streamIndex: number;
  trackIndex: number;
  language: string;
  label: string;
  title: string | null;
  codec: string | null;
  channels: number | null;
  channelLayout: string | null;
  sampleRate: number | null;
  default: boolean;
};

type EmbeddedSubtitleTrack = {
  streamIndex: number;
  trackIndex: number;
  language: string;
  label: string;
  title: string | null;
  codec: string | null;
  default: boolean;
  forced: boolean;
  hearingImpaired: boolean;
  textBased: boolean;
};

type SubtitleTrack = {
  id: string;
  language: string;
  label: string;
  src: string;
  default?: boolean;
  source: "embedded" | "subdl";
};

type SubtitleSearchResult = {
  fileId: string;
  language: string;
  label: string;
  release: string | null;
  downloadCount: number;
  hearingImpaired: boolean;
  fileName: string | null;
  url: string;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const total = Math.max(
    0,
    Math.floor(seconds),
  );

  const hours = Math.floor(
    total / 3600,
  );

  const minutes = Math.floor(
    (total % 3600) / 60,
  );

  const remaining =
    total % 60;

  if (hours > 0) {
    return `${hours}:${String(
      minutes,
    ).padStart(2, "0")}:${String(
      remaining,
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(
    remaining,
  ).padStart(2, "0")}`;
}

function getAudioLabel(
  track: AudioTrack,
) {
  if (track.label?.trim()) {
    return track.label;
  }

  if (track.title?.trim()) {
    return track.title;
  }

  if (track.language?.trim()) {
    return track.language.toUpperCase();
  }

  return `Audio ${track.trackIndex + 1}`;
}

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
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const saveTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null,
    );

  const controlsTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const lastSavedPositionRef =
    useRef(initialPosition);

  const completedRef =
    useRef(initialCompleted);

  const switchingAudioRef =
    useRef(false);

  const selectedAudioRef =
    useRef<number | null>(null);

  const [playing, setPlaying] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(initialPosition);

  const [duration, setDuration] =
    useState(0);

  const [volume, setVolume] =
    useState(1);

  const [muted, setMuted] =
    useState(false);

  const [showControls, setShowControls] =
    useState(true);

  const [fullscreen, setFullscreen] =
    useState(false);

  const [audioTracks, setAudioTracks] =
    useState<AudioTrack[]>([]);

  const [selectedAudioTrack, setSelectedAudioTrack] =
    useState<number | null>(null);

  const [embeddedSubtitles, setEmbeddedSubtitles] =
    useState<EmbeddedSubtitleTrack[]>([]);

  const [subtitleTracks, setSubtitleTracks] =
    useState<SubtitleTrack[]>([]);

  const [selectedSubtitle, setSelectedSubtitle] =
    useState<string>("off");

  const [showAudioMenu, setShowAudioMenu] =
    useState(false);

  const [showSubtitleMenu, setShowSubtitleMenu] =
    useState(false);

  const [showSettings, setShowSettings] =
    useState(false);

  const [subtitleSearchLanguage, setSubtitleSearchLanguage] =
    useState("en");

  const [subtitleResults, setSubtitleResults] =
    useState<SubtitleSearchResult[]>([]);

  const [searchingSubtitles, setSearchingSubtitles] =
    useState(false);

  const [downloadingSubtitle, setDownloadingSubtitle] =
    useState<string | null>(null);

  const [trackError, setTrackError] =
    useState<string | null>(null);

  const [audioSwitching, setAudioSwitching] =
    useState(false);

  const videoUrl =
    `/api/videos/${episodeId}`;

  const showControlsTemporarily =
    useCallback(() => {
      setShowControls(true);

      if (controlsTimerRef.current) {
        clearTimeout(
          controlsTimerRef.current,
        );
      }

      controlsTimerRef.current =
        setTimeout(() => {
          if (
            videoRef.current &&
            !videoRef.current.paused
          ) {
            setShowControls(false);
          }
        }, 3000);
    }, []);

  /*
   * ------------------------------------------------------------
   * TRACK LOADING
   * ------------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    async function loadTracks() {
      try {
        setTrackError(null);

        const response =
          await fetch(
            `/api/episodes/${episodeId}/tracks`,
            {
              cache: "no-store",
            },
          );

        const contentType =
          response.headers.get(
            "content-type",
          ) ?? "";

        if (!response.ok) {
          const text =
            await response.text();

          throw new Error(
            `Tracks API returned ${response.status}: ${text.slice(
              0,
              300,
            )}`,
          );
        }

        if (
          !contentType.includes(
            "application/json",
          )
        ) {
          const text =
            await response.text();

          throw new Error(
            `Tracks API returned non-JSON: ${text.slice(
              0,
              300,
            )}`,
          );
        }

        const data =
          await response.json();

        if (
          cancelled
        ) {
          return;
        }

        if (!data.success) {
          throw new Error(
            data.error ??
              "Failed to load tracks",
          );
        }

        const audio =
          Array.isArray(data.audio)
            ? data.audio
            : [];

        const subtitles =
          Array.isArray(
            data.subtitles,
          )
            ? data.subtitles
            : [];

        setAudioTracks(audio);

        setEmbeddedSubtitles(
          subtitles.filter(
            (
              track: EmbeddedSubtitleTrack,
            ) =>
              track.textBased !== false,
          ),
        );

        /*
         * Prefer the stream marked default.
         * Otherwise use the first audio track.
         */
        const defaultAudio =
          audio.find(
            (track: AudioTrack) =>
              track.default,
          ) ?? audio[0];

        if (defaultAudio) {
          setSelectedAudioTrack(
            defaultAudio.streamIndex,
          );

          selectedAudioRef.current =
            defaultAudio.streamIndex;
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "[LumaVault] Failed to load episode tracks:",
          error,
        );

        setTrackError(
          error instanceof Error
            ? error.message
            : "Failed to load tracks",
        );
      }
    }

    loadTracks();

    return () => {
      cancelled = true;
    };
  }, [episodeId]);

  /*
   * ------------------------------------------------------------
   * SUBTITLE LIST
   * ------------------------------------------------------------
   */

  const allSubtitleTracks =
    useMemo<SubtitleTrack[]>(() => {
      const embedded =
        embeddedSubtitles.map(
          (track) => ({
            id: `embedded-${track.streamIndex}`,
            language:
              track.language || "und",
            label:
              track.label ||
              track.title ||
              track.language ||
              `Subtitle ${track.trackIndex + 1}`,
            src:
              `/api/episodes/${episodeId}/subtitles/${track.streamIndex}`,
            default:
              track.default,
            source: "embedded" as const,
          }),
        );

      return [
        ...embedded,
        ...subtitleTracks,
      ];
    }, [
      embeddedSubtitles,
      subtitleTracks,
      episodeId,
    ]);

  /*
   * ------------------------------------------------------------
   * PLAY / PAUSE
   * ------------------------------------------------------------
   */

  const togglePlay =
    useCallback(async () => {
      const video =
        videoRef.current;

      if (!video) {
        return;
      }

      try {
        if (
          video.paused ||
          video.ended
        ) {
          if (video.ended) {
            video.currentTime = 0;
          }

          const playPromise =
            video.play();

          if (
            playPromise !==
            undefined
          ) {
            await playPromise;
          }
        } else {
          video.pause();
        }

        showControlsTemporarily();
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "[LumaVault] Unable to toggle playback:",
          error,
        );
      }
    }, [
      showControlsTemporarily,
    ]);

  /*
   * ------------------------------------------------------------
   * AUDIO SWITCHING
   * ------------------------------------------------------------
   */

  const switchAudio =
    useCallback(
      async (
        streamIndex: number | null,
      ) => {
        const video =
          videoRef.current;

        if (
          !video ||
          streamIndex === null
        ) {
          return;
        }

        if (
          selectedAudioRef.current ===
          streamIndex
        ) {
          setShowAudioMenu(false);
          return;
        }

        if (
          switchingAudioRef.current
        ) {
          return;
        }

        switchingAudioRef.current =
          true;

        setAudioSwitching(true);
        setShowAudioMenu(false);
        setShowSubtitleMenu(false);

        const position =
          Number.isFinite(
            video.currentTime,
          )
            ? video.currentTime
            : 0;

        const wasPlaying =
          !video.paused &&
          !video.ended;

        selectedAudioRef.current =
          streamIndex;

        setSelectedAudioTrack(
          streamIndex,
        );

        try {
          /*
           * IMPORTANT:
           *
           * The backend remuxes the same video:
           *
           * -c:v copy
           * -c:a copy
           *
           * Only the selected audio stream changes.
           */
          const newUrl =
            `${videoUrl}?audio=${encodeURIComponent(
              streamIndex,
            )}`;

          video.pause();

          video.src = newUrl;
          video.load();

          await new Promise<void>(
            (
              resolve,
              reject,
            ) => {
              let settled = false;

              const cleanup =
                () => {
                  video.removeEventListener(
                    "loadedmetadata",
                    onLoadedMetadata,
                  );

                  video.removeEventListener(
                    "error",
                    onError,
                  );
                };

              const onLoadedMetadata =
                async () => {
                  if (settled) {
                    return;
                  }

                  settled = true;

                  cleanup();

                  try {
                    if (
                      Number.isFinite(
                        position,
                      )
                    ) {
                      video.currentTime =
                        Math.min(
                          position,
                          Number.isFinite(
                            video.duration,
                          )
                            ? video.duration
                            : position,
                        );
                    }

                    if (wasPlaying) {
                      const playPromise =
                        video.play();

                      if (
                        playPromise !==
                        undefined
                      ) {
                        await playPromise;
                      }
                    }

                    resolve();
                  } catch (error) {
                    reject(error);
                  }
                };

              const onError =
                () => {
                  if (settled) {
                    return;
                  }

                  settled = true;

                  cleanup();

                  reject(
                    new Error(
                      "The selected audio track could not be loaded.",
                    ),
                  );
                };

              video.addEventListener(
                "loadedmetadata",
                onLoadedMetadata,
                {
                  once: true,
                },
              );

              video.addEventListener(
                "error",
                onError,
                {
                  once: true,
                },
              );
            },
          );

          showControlsTemporarily();
        } catch (error) {
          console.error(
            "[LumaVault] Failed to switch audio:",
            error,
          );

          /*
           * Restore normal source if the
           * remuxed stream fails.
           */
          video.src = videoUrl;
          video.load();

          video.addEventListener(
            "loadedmetadata",
            () => {
              video.currentTime =
                position;

              if (wasPlaying) {
                video
                  .play()
                  .catch(() => {});
              }
            },
            {
              once: true,
            },
          );
        } finally {
          switchingAudioRef.current =
            false;

          setAudioSwitching(false);
        }
      },
      [
        videoUrl,
        showControlsTemporarily,
      ],
    );

  /*
   * ------------------------------------------------------------
   * SUBTITLE SELECTION
   * ------------------------------------------------------------
   */

  const selectSubtitle =
    useCallback(
      (subtitleId: string) => {
        setSelectedSubtitle(
          subtitleId,
        );

        const video =
          videoRef.current;

        if (!video) {
          return;
        }

        const tracks =
          video.textTracks;

        for (
          let index = 0;
          index < tracks.length;
          index++
        ) {
          tracks[index].mode =
            "disabled";
        }

        if (
          subtitleId === "off"
        ) {
          setShowSubtitleMenu(
            false,
          );

          return;
        }

        const subtitle =
          allSubtitleTracks.find(
            (track) =>
              track.id ===
              subtitleId,
          );

        if (!subtitle) {
          return;
        }

        /*
         * Track matching is done by
         * the generated id rather than
         * language because multiple
         * subtitles can have the same
         * language.
         */
        const trackElements =
          video.querySelectorAll(
            "track",
          );

        trackElements.forEach(
          (element) => {
            const elementId =
              element.getAttribute(
                "data-track-id",
              );

            if (
              elementId ===
              subtitle.id
            ) {
              const track =
                element.track;

              if (track) {
                track.mode =
                  "showing";
              }
            }
          },
        );

        setShowSubtitleMenu(
          false,
        );

        showControlsTemporarily();
      },
      [
        allSubtitleTracks,
        showControlsTemporarily,
      ],
    );

  /*
   * ------------------------------------------------------------
   * SUBTITLE SEARCH
   * ------------------------------------------------------------
   */

  const searchSubtitles =
    useCallback(async () => {
      try {
        setSearchingSubtitles(
          true,
        );

        setSubtitleResults(
          [],
        );

        const response =
          await fetch(
            `/api/subtitles/episodes/${episodeId}?language=${encodeURIComponent(
              subtitleSearchLanguage,
            )}`,
            {
              cache: "no-store",
            },
          );

        if (!response.ok) {
          throw new Error(
            "Failed to search subtitles",
          );
        }

        const data =
          await response.json();

        setSubtitleResults(
          data.results ?? [],
        );
      } catch (error) {
        console.error(
          "[LumaVault] Subtitle search failed:",
          error,
        );
      } finally {
        setSearchingSubtitles(
          false,
        );
      }
    }, [
      episodeId,
      subtitleSearchLanguage,
    ]);

  /*
   * ------------------------------------------------------------
   * SUBTITLE DOWNLOAD
   * ------------------------------------------------------------
   */

  const downloadSubtitle =
    useCallback(
      async (
        result: SubtitleSearchResult,
      ) => {
        try {
          setDownloadingSubtitle(
            result.fileId,
          );

          const response =
            await fetch(
              `/api/subtitles/episodes/${episodeId}/download`,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  fileUrl:
                    result.url,
                  language:
                    result.language,
                }),
              },
            );

          if (!response.ok) {
            throw new Error(
              "Failed to download subtitle",
            );
          }

          const data =
            await response.json();

          if (
            data.src ||
            data.url
          ) {
            const newSubtitle: SubtitleTrack =
              {
                id: `subdl-${result.fileId}`,
                language:
                  result.language,
                label:
                  result.label ||
                  result.language.toUpperCase(),
                src:
                  data.src ??
                  data.url,
                source: "subdl",
              };

            setSubtitleTracks(
              (current) => {
                const withoutDuplicate =
                  current.filter(
                    (track) =>
                      track.id !==
                      newSubtitle.id,
                  );

                return [
                  ...withoutDuplicate,
                  newSubtitle,
                ];
              },
            );
          }

          /*
           * If the API returns only a success
           * response, use the language endpoint
           * already provided by the backend.
           */
          const fallbackTrack: SubtitleTrack =
            {
              id: `subdl-${result.fileId}`,
              language:
                result.language,
              label:
                result.label ||
                result.language.toUpperCase(),
              src:
                `/api/subtitles/episodes/${episodeId}/${encodeURIComponent(
                  result.language,
                )}`,
              source: "subdl",
            };

          setSubtitleTracks(
            (current) => {
              const withoutDuplicate =
                current.filter(
                  (track) =>
                    track.id !==
                    fallbackTrack.id,
                );

              return [
                ...withoutDuplicate,
                fallbackTrack,
              ];
            },
          );

          setShowSubtitleMenu(
            true,
          );
        } catch (error) {
          console.error(
            "[LumaVault] Subtitle download failed:",
            error,
          );
        } finally {
          setDownloadingSubtitle(
            null,
          );
        }
      },
      [episodeId],
    );

  /*
   * ------------------------------------------------------------
   * PROGRESS
   * ------------------------------------------------------------
   */

  const saveProgress =
    useCallback(
      async (
        position: number,
        isCompleted = false,
        useBeacon = false,
      ) => {
        if (
          !Number.isFinite(
            position,
          )
        ) {
          return;
        }

        const rounded =
          Math.max(
            0,
            Math.floor(position),
          );

        if (
          !isCompleted &&
          Math.abs(
            rounded -
              lastSavedPositionRef.current,
          ) < 10
        ) {
          return;
        }

        lastSavedPositionRef.current =
          rounded;

        const body = JSON.stringify({
          episodeId,
          position: rounded,
          completed:
            isCompleted,
        });

        try {
          if (
            useBeacon &&
            typeof navigator !==
              "undefined" &&
            navigator.sendBeacon
          ) {
            const blob =
              new Blob(
                [body],
                {
                  type:
                    "application/json",
                },
              );

            navigator.sendBeacon(
              "/api/progress",
              blob,
            );

            return;
          }

          await fetch(
            "/api/progress",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body,
              keepalive: true,
            },
          );
        } catch (error) {
          console.error(
            "[LumaVault] Failed to save progress:",
            error,
          );
        }
      },
      [episodeId],
    );

  useEffect(() => {
    saveTimerRef.current =
      setInterval(() => {
        const video =
          videoRef.current;

        if (!video) {
          return;
        }

        const position =
          video.currentTime;

        if (
          !Number.isFinite(
            position,
          )
        ) {
          return;
        }

        const isCompleted =
          video.duration > 0 &&
          position /
            video.duration >=
            0.9;

        if (
          isCompleted &&
          !completedRef.current
        ) {
          completedRef.current =
            true;

          saveProgress(
            position,
            true,
          );
        } else {
          saveProgress(
            position,
            false,
          );
        }
      }, 15000);

    return () => {
      if (
        saveTimerRef.current
      ) {
        clearInterval(
          saveTimerRef.current,
        );
      }
    };
  }, [saveProgress]);

  useEffect(() => {
    const handlePageHide =
      () => {
        const video =
          videoRef.current;

        if (!video) {
          return;
        }

        saveProgress(
          video.currentTime,
          completedRef.current,
          true,
        );
      };

    window.addEventListener(
      "pagehide",
      handlePageHide,
    );

    return () => {
      window.removeEventListener(
        "pagehide",
        handlePageHide,
      );
    };
  }, [saveProgress]);

  /*
   * ------------------------------------------------------------
   * VIDEO EVENTS
   * ------------------------------------------------------------
   */

  const handleLoadedMetadata =
    () => {
      const video =
        videoRef.current;

      if (!video) {
        return;
      }

      setDuration(
        Number.isFinite(
          video.duration,
        )
          ? video.duration
          : 0,
      );

      if (
        initialPosition > 0 &&
        initialPosition <
          video.duration - 5
      ) {
        video.currentTime =
          initialPosition;
      }
    };

  const handleTimeUpdate =
    () => {
      const video =
        videoRef.current;

      if (!video) {
        return;
      }

      setCurrentTime(
        video.currentTime,
      );

      if (
        video.duration > 0 &&
        video.currentTime /
          video.duration >=
          0.9 &&
        !completedRef.current
      ) {
        completedRef.current =
          true;

        saveProgress(
          video.currentTime,
          true,
        );
      }
    };

  const handleProgressChange =
    (
      event: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const video =
        videoRef.current;

      if (!video) {
        return;
      }

      const position =
        Number(
          event.target.value,
        );

      video.currentTime =
        position;

      setCurrentTime(
        position,
      );

      showControlsTemporarily();
    };

  const handleVolumeChange =
    (
      event: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const value =
        Number(
          event.target.value,
        );

      setVolume(value);

      const video =
        videoRef.current;

      if (video) {
        video.volume =
          value;

        if (value > 0) {
          video.muted = false;
          setMuted(false);
        }
      }
    };

  const toggleMute =
    () => {
      const video =
        videoRef.current;

      if (!video) {
        return;
      }

      video.muted =
        !video.muted;

      setMuted(
        video.muted,
      );
    };

  /*
   * ------------------------------------------------------------
   * FULLSCREEN
   * ------------------------------------------------------------
   */

  const toggleFullscreen =
    async () => {
      const container =
        containerRef.current;

      if (!container) {
        return;
      }

      try {
        if (
          document.fullscreenElement
        ) {
          await document.exitFullscreen();
        } else {
          await container.requestFullscreen();
        }
      } catch (error) {
        console.error(
          "[LumaVault] Fullscreen failed:",
          error,
        );
      }
    };

  useEffect(() => {
    const handleFullscreen =
      () => {
        setFullscreen(
          Boolean(
            document.fullscreenElement,
          ),
        );
      };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreen,
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreen,
      );
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * KEYBOARD
   * ------------------------------------------------------------
   */

  useEffect(() => {
    const handleKeyDown =
      (event: KeyboardEvent) => {
        const target =
          event.target as HTMLElement | null;

        if (
          target?.tagName ===
            "INPUT" ||
          target?.tagName ===
            "TEXTAREA"
        ) {
          return;
        }

        const video =
          videoRef.current;

        if (!video) {
          return;
        }

        switch (
          event.key.toLowerCase()
        ) {
          case " ":
          case "k":
            event.preventDefault();
            togglePlay();
            break;

          case "f":
            event.preventDefault();
            toggleFullscreen();
            break;

          case "m":
            event.preventDefault();
            toggleMute();
            break;

          case "arrowleft":
            event.preventDefault();

            video.currentTime =
              Math.max(
                0,
                video.currentTime -
                  10,
              );

            showControlsTemporarily();
            break;

          case "arrowright":
            event.preventDefault();

            video.currentTime =
              Math.min(
                video.duration || Infinity,
                video.currentTime +
                  10,
              );

            showControlsTemporarily();
            break;
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    togglePlay,
    toggleMute,
    toggleFullscreen,
    showControlsTemporarily,
  ]);

  /*
   * ------------------------------------------------------------
   * CLEANUP
   * ------------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      if (
        controlsTimerRef.current
      ) {
        clearTimeout(
          controlsTimerRef.current,
        );
      }

      if (
        saveTimerRef.current
      ) {
        clearInterval(
          saveTimerRef.current,
        );
      }
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  const progressPercent =
    duration > 0
      ? Math.min(
          100,
          (currentTime /
            duration) *
            100,
        )
      : 0;

  return (
    <div className="w-full bg-black text-white">
      <div
        ref={containerRef}
        className="relative overflow-hidden bg-black"
        onMouseMove={
          showControlsTemporarily
        }
        onClick={
          showControlsTemporarily
        }
      >
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          preload="metadata"
          className="aspect-video w-full bg-black object-contain"
          onLoadedMetadata={
            handleLoadedMetadata
          }
          onTimeUpdate={
            handleTimeUpdate
          }
          onPlay={() =>
            setPlaying(true)
          }
          onPause={() =>
            setPlaying(false)
          }
          onEnded={() => {
            setPlaying(false);
            completedRef.current =
              true;

            saveProgress(
              0,
              true,
            );
          }}
          onClick={(event) => {
            event.stopPropagation();
            togglePlay();
          }}
          onDoubleClick={
            toggleFullscreen
          }
        >
          {allSubtitleTracks.map(
            (subtitle) => (
              <track
                key={subtitle.id}
                data-track-id={
                  subtitle.id
                }
                kind="subtitles"
                src={subtitle.src}
                srcLang={
                  subtitle.language
                }
                label={
                  subtitle.label
                }
                default={false}
              />
            ),
          )}
        </video>

        {/* Center play button */}

        {!playing && (
          <button
            type="button"
            aria-label="Play"
            onClick={(event) => {
              event.stopPropagation();
              togglePlay();
            }}
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-2xl transition hover:scale-105"
          >
            <Play className="ml-1 h-7 w-7 fill-current" />
          </button>
        )}

        {/* Controls */}

        <div
          className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-4 pt-12 transition-opacity duration-300 ${
            showControls
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          {/* Progress */}

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(
              currentTime,
              duration || 0,
            )}
            onChange={
              handleProgressChange
            }
            aria-label="Video progress"
            className="mb-3 h-1 w-full cursor-pointer accent-red-600"
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {/* Play */}

              <button
                type="button"
                onClick={
                  togglePlay
                }
                aria-label={
                  playing
                    ? "Pause"
                    : "Play"
                }
                className="rounded p-2 transition hover:bg-white/10"
              >
                {playing ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 fill-current" />
                )}
              </button>

              {/* Time */}

              <span className="whitespace-nowrap text-xs text-zinc-300">
                {formatTime(
                  currentTime,
                )}{" "}
                /{" "}
                {formatTime(
                  duration,
                )}
              </span>

              {/* Volume */}

              <div className="hidden items-center gap-1 sm:flex">
                <button
                  type="button"
                  onClick={
                    toggleMute
                  }
                  className="rounded p-2 transition hover:bg-white/10"
                  aria-label={
                    muted
                      ? "Unmute"
                      : "Mute"
                  }
                >
                  {muted ||
                  volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={
                    muted
                      ? 0
                      : volume
                  }
                  onChange={
                    handleVolumeChange
                  }
                  aria-label="Volume"
                  className="w-20 cursor-pointer accent-red-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Audio */}

              {audioTracks.length >
                0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAudioMenu(
                        (value) =>
                          !value,
                      );

                      setShowSubtitleMenu(
                        false,
                      );
                    }}
                    className="flex items-center gap-1 rounded px-2 py-2 text-xs transition hover:bg-white/10 sm:px-3"
                  >
                    <Volume2 className="h-4 w-4" />

                    <span className="hidden sm:inline">
                      Audio
                    </span>

                    <ChevronDown className="h-3 w-3" />
                  </button>

                  {showAudioMenu && (
                    <div className="absolute bottom-11 right-0 z-50 w-72 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 shadow-2xl">
                      <div className="border-b border-zinc-800 px-3 py-2">
                        <p className="text-xs font-semibold text-white">
                          Audio
                        </p>

                        <p className="text-[11px] text-zinc-500">
                          {audioSwitching
                            ? "Switching track..."
                            : `${audioTracks.length} track${
                                audioTracks.length ===
                                1
                                  ? ""
                                  : "s"
                              }`}
                        </p>
                      </div>

                      <div className="max-h-64 overflow-y-auto overscroll-contain p-1">
                        {audioTracks.map(
                          (
                            track,
                          ) => {
                            const selected =
                              selectedAudioTrack ===
                              track.streamIndex;

                            return (
                              <button
                                key={`${track.streamIndex}-${track.trackIndex}`}
                                type="button"
                                disabled={
                                  audioSwitching
                                }
                                onClick={() =>
                                  switchAudio(
                                    track.streamIndex,
                                  )
                                }
                                className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left transition ${
                                  selected
                                    ? "bg-white text-black"
                                    : "text-zinc-200 hover:bg-zinc-800"
                                } ${
                                  audioSwitching
                                    ? "cursor-wait opacity-60"
                                    : ""
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {getAudioLabel(
                                      track,
                                    )}
                                  </p>

                                  <p
                                    className={`truncate text-[11px] ${
                                      selected
                                        ? "text-zinc-600"
                                        : "text-zinc-500"
                                    }`}
                                  >
                                    {track.language
                                      ? track.language.toUpperCase()
                                      : "Unknown"}
                                    {track.codec
                                      ? ` • ${track.codec.toUpperCase()}`
                                      : ""}
                                    {track.channelLayout
                                      ? ` • ${track.channelLayout}`
                                      : ""}
                                  </p>
                                </div>

                                {selected && (
                                  <Check className="ml-3 h-4 w-4 shrink-0" />
                                )}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Subtitles */}

              {allSubtitleTracks.length >
                0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubtitleMenu(
                        (value) =>
                          !value,
                      );

                      setShowAudioMenu(
                        false,
                      );
                    }}
                    className="flex items-center gap-1 rounded px-2 py-2 text-xs transition hover:bg-white/10 sm:px-3"
                  >
                    <span className="text-sm font-semibold">
                      CC
                    </span>

                    <ChevronDown className="h-3 w-3" />
                  </button>

                  {showSubtitleMenu && (
                    <div className="absolute bottom-11 right-0 z-50 w-80 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 shadow-2xl">
                      <div className="border-b border-zinc-800 px-3 py-2">
                        <p className="text-xs font-semibold text-white">
                          Subtitles
                        </p>

                        <p className="text-[11px] text-zinc-500">
                          Embedded and downloaded
                        </p>
                      </div>

                      <div className="max-h-64 overflow-y-auto overscroll-contain p-1">
                        <button
                          type="button"
                          onClick={() =>
                            selectSubtitle(
                              "off",
                            )
                          }
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition ${
                            selectedSubtitle ===
                            "off"
                              ? "bg-white text-black"
                              : "text-zinc-200 hover:bg-zinc-800"
                          }`}
                        >
                          <span>
                            Off
                          </span>

                          {selectedSubtitle ===
                            "off" && (
                            <Check className="h-4 w-4" />
                          )}
                        </button>

                        {allSubtitleTracks.map(
                          (
                            subtitle,
                          ) => (
                            <button
                              key={
                                subtitle.id
                              }
                              type="button"
                              onClick={() =>
                                selectSubtitle(
                                  subtitle.id,
                                )
                              }
                              className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left transition ${
                                selectedSubtitle ===
                                subtitle.id
                                  ? "bg-white text-black"
                                  : "text-zinc-200 hover:bg-zinc-800"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {
                                    subtitle.label
                                  }
                                </p>

                                <p
                                  className={`text-[11px] ${
                                    selectedSubtitle ===
                                    subtitle.id
                                      ? "text-zinc-600"
                                      : "text-zinc-500"
                                  }`}
                                >
                                  {subtitle.language.toUpperCase()}
                                  {" • "}
                                  {subtitle.source ===
                                  "embedded"
                                    ? "Embedded"
                                    : "SubDL"}
                                </p>
                              </div>

                              {selectedSubtitle ===
                                subtitle.id && (
                                <Check className="ml-3 h-4 w-4 shrink-0" />
                              )}
                            </button>
                          ),
                        )}
                      </div>

                      {/* SubDL */}

                      <div className="border-t border-zinc-800 p-2">
                        <div className="mb-2 flex gap-2">
                          <select
                            value={
                              subtitleSearchLanguage
                            }
                            onChange={(
                              event,
                            ) =>
                              setSubtitleSearchLanguage(
                                event.target.value,
                              )
                            }
                            className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-white outline-none"
                          >
                            <option value="en">
                              English
                            </option>

                            <option value="si">
                              Sinhala
                            </option>

                            <option value="ta">
                              Tamil
                            </option>
                          </select>

                          <button
                            type="button"
                            onClick={
                              searchSubtitles
                            }
                            disabled={
                              searchingSubtitles
                            }
                            className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50"
                          >
                            <Search className="h-3.5 w-3.5" />

                            {searchingSubtitles
                              ? "Searching"
                              : "Search"}
                          </button>
                        </div>

                        {subtitleResults.length >
                          0 && (
                          <div className="max-h-48 overflow-y-auto overscroll-contain space-y-1">
                            {subtitleResults.map(
                              (
                                result,
                              ) => (
                                <div
                                  key={
                                    result.fileId
                                  }
                                  className="rounded-md bg-zinc-900 p-2"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-medium text-white">
                                        {
                                          result.label
                                        }
                                      </p>

                                      <p className="mt-0.5 text-[10px] text-zinc-500">
                                        {result.release ||
                                          "Unknown release"}
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        downloadSubtitle(
                                          result,
                                        )
                                      }
                                      disabled={
                                        downloadingSubtitle ===
                                        result.fileId
                                      }
                                      className="shrink-0 rounded bg-white px-2 py-1 text-[10px] font-medium text-black disabled:opacity-50"
                                    >
                                      {downloadingSubtitle ===
                                      result.fileId
                                        ? "..."
                                        : "Use"}
                                    </button>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Settings */}

              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setShowSettings(
                      (value) =>
                        !value,
                    )
                  }
                  className="rounded p-2 transition hover:bg-white/10"
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                </button>

                {showSettings && (
                  <div className="absolute bottom-11 right-0 z-50 w-72 rounded-lg border border-zinc-700 bg-zinc-950 p-3 shadow-2xl">
                    <p className="text-xs font-semibold">
                      Playback
                    </p>

                    <div className="mt-3 space-y-2 text-xs text-zinc-400">
                      <p>
                        Episode{" "}
                        {seasonNumber}x
                        {String(
                          episodeNumber,
                        ).padStart(
                          2,
                          "0",
                        )}
                      </p>

                      {trackError && (
                        <p className="break-words text-red-400">
                          {trackError}
                        </p>
                      )}

                      <p>
                        Audio tracks:{" "}
                        {
                          audioTracks.length
                        }
                      </p>

                      <p>
                        Subtitles:{" "}
                        {
                          allSubtitleTracks.length
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Fullscreen */}

              <button
                type="button"
                onClick={
                  toggleFullscreen
                }
                className="rounded p-2 transition hover:bg-white/10"
                aria-label={
                  fullscreen
                    ? "Exit fullscreen"
                    : "Fullscreen"
                }
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Audio switching overlay */}

        {audioSwitching && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div className="rounded-lg bg-black/80 px-4 py-3 text-sm text-white shadow-xl">
              Switching audio track...
            </div>
          </div>
        )}
      </div>

      {/* Episode information */}

      <div className="px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>
            {seriesTitle}
          </span>

          <span>•</span>

          <span>
            S
            {String(
              seasonNumber,
            ).padStart(2, "0")}
            E
            {String(
              episodeNumber,
            ).padStart(2, "0")}
          </span>

          {completedRef.current && (
            <>
              <span>•</span>

              <span className="text-green-500">
                Completed
              </span>
            </>
          )}
        </div>

        <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">
            {description}
          </p>
        )}

        {initialPosition > 0 &&
          !initialCompleted && (
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <RotateCcw className="h-3.5 w-3.5" />

              <span>
                Resuming from{" "}
                {formatTime(
                  initialPosition,
                )}
              </span>
            </div>
          )}
      </div>
    </div>
  );
}