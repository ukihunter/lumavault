
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Captions,
  Check,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Search,
  Settings,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

type SubtitleTrack = {
  language: string;
  label: string;
  src: string;
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

type EpisodeProgressResponse = {
  success: boolean;
  progress?: {
    id: string;
    position: number;
    completed: boolean;
    updatedAt: string;
    episode: {
      id: string;
      title: string;
      duration: number | null;
    } | null;
  } | null;
  error?: string;
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

  const containerRef = useRef<HTMLDivElement | null>(null);

  const subtitleTrackRefs = useRef<
    Record<string, HTMLTrackElement | null>
  >({});

  const controlsTimeout = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const resumePositionRef = useRef<number>(
    Math.max(0, initialPosition)
  );

  const [playing, setPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(
    Math.max(0, initialPosition)
  );

  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(1);

  const [muted, setMuted] = useState(false);

  const [showControls, setShowControls] = useState(true);

  const [playbackRate, setPlaybackRate] = useState(1);

  const [completed, setCompleted] = useState(
    initialCompleted
  );

  // ----------------------------------------------------------
  // Subtitles
  // ----------------------------------------------------------

  const [subtitleMenuOpen, setSubtitleMenuOpen] =
    useState(false);

  const [subtitleTracks, setSubtitleTracks] =
    useState<SubtitleTrack[]>([]);

  const [subtitleResults, setSubtitleResults] =
    useState<SubtitleSearchResult[]>([]);

  const [subtitleSearching, setSubtitleSearching] =
    useState(false);

  const [subtitleDownloading, setSubtitleDownloading] =
    useState(false);

  const [subtitleError, setSubtitleError] =
    useState<string | null>(null);

  const [selectedSubtitle, setSelectedSubtitle] =
    useState("off");

  // ----------------------------------------------------------
  // Load database progress
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadEpisodeProgress = async () => {
      try {
        const response = await fetch(
          `/api/progress?episodeId=${encodeURIComponent(
            episodeId
          )}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          return;
        }

        const data: EpisodeProgressResponse =
          await response.json();

        if (
          cancelled ||
          !data.success ||
          !data.progress
        ) {
          return;
        }

        const position = Number(
          data.progress.position
        );

        if (
          !Number.isFinite(position) ||
          position <= 0 ||
          data.progress.completed
        ) {
          return;
        }

        resumePositionRef.current = position;

        setCurrentTime(position);

        const video = videoRef.current;

        if (
          video &&
          video.readyState >= 1 &&
          Number.isFinite(video.duration) &&
          position < video.duration - 5
        ) {
          video.currentTime = position;
          setCurrentTime(position);
        }

        console.log(
          "[LumaVault] Episode progress loaded:",
          {
            episodeId,
            position,
          }
        );
      } catch (error) {
        console.error(
          "Failed to load episode progress:",
          error
        );
      }
    };

    void loadEpisodeProgress();

    return () => {
      cancelled = true;
    };
  }, [episodeId]);

  // ----------------------------------------------------------
  // Video + progress
  // ----------------------------------------------------------

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const restoreResumePosition = () => {
      const position =
        resumePositionRef.current;

      if (
        !Number.isFinite(position) ||
        position <= 0
      ) {
        return;
      }

      if (
        !Number.isFinite(video.duration) ||
        video.duration <= 0
      ) {
        return;
      }

      if (
        position < video.duration - 5
      ) {
        video.currentTime = position;
        setCurrentTime(position);
      }
    };

    const saveProgress = async (
      isCompleted = false
    ) => {
      const position = Number.isFinite(
        video.currentTime
      )
        ? Math.floor(video.currentTime)
        : 0;

      if (!isCompleted && position <= 0) {
        return;
      }

      try {
        const response = await fetch(
          "/api/progress",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              episodeId,
              position,
              completed: isCompleted,
            }),
          }
        );

        if (!response.ok) {
          console.error(
            "[LumaVault] Failed to save episode progress:",
            response.status
          );

          return;
        }

        if (isCompleted) {
          setCompleted(true);
        }

        console.log(
          "[LumaVault] Episode progress saved:",
          {
            episodeId,
            position,
            completed: isCompleted,
          }
        );
      } catch (error) {
        console.error(
          "Failed to save episode progress:",
          error
        );
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      if (
        Number.isFinite(video.duration) &&
        video.duration > 0 &&
        video.currentTime >=
          video.duration * 0.9 &&
        !completed
      ) {
        void saveProgress(true);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(
        Number.isFinite(video.duration)
          ? video.duration
          : 0
      );

      restoreResumePosition();
    };

    const handlePlay = () => {
      setPlaying(true);
    };

    const handlePause = () => {
      setPlaying(false);
      void saveProgress(false);
    };

    const handleEnded = () => {
      setPlaying(false);
      setCompleted(true);

      void saveProgress(true);

      resumePositionRef.current = 0;
    };

    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    video.addEventListener(
      "timeupdate",
      handleTimeUpdate
    );

    video.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata
    );

    video.addEventListener(
      "play",
      handlePlay
    );

    video.addEventListener(
      "pause",
      handlePause
    );

    video.addEventListener(
      "ended",
      handleEnded
    );

    const interval = window.setInterval(() => {
      if (
        !video.paused &&
        !video.ended
      ) {
        void saveProgress(false);
      }
    }, 5000);

    const saveBeforeLeaving = () => {
      if (
        !Number.isFinite(video.currentTime)
      ) {
        return;
      }

      const payload = JSON.stringify({
        episodeId,
        position: Math.floor(
          video.currentTime
        ),
        completed,
      });

      try {
        navigator.sendBeacon(
          "/api/progress",
          new Blob([payload], {
            type: "application/json",
          })
        );
      } catch (error) {
        console.error(
          "Failed to save episode progress on exit:",
          error
        );
      }
    };

    window.addEventListener(
      "pagehide",
      saveBeforeLeaving
    );

    return () => {
      window.clearInterval(interval);

      window.removeEventListener(
        "pagehide",
        saveBeforeLeaving
      );

      void saveProgress(false);

      video.removeEventListener(
        "timeupdate",
        handleTimeUpdate
      );

      video.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      );

      video.removeEventListener(
        "play",
        handlePlay
      );

      video.removeEventListener(
        "pause",
        handlePause
      );

      video.removeEventListener(
        "ended",
        handleEnded
      );
    };
  }, [
    episodeId,
    completed,
  ]);

  // ----------------------------------------------------------
  // Controls
  // ----------------------------------------------------------

  const showControlsTemporarily =
    useCallback(() => {
      setShowControls(true);

      if (controlsTimeout.current) {
        clearTimeout(
          controlsTimeout.current
        );
      }

      controlsTimeout.current =
        setTimeout(() => {
          const video =
            videoRef.current;

          if (
            video &&
            !video.paused
          ) {
            setShowControls(false);
          }
        }, 2500);
    }, []);

  useEffect(() => {
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(
          controlsTimeout.current
        );
      }
    };
  }, []);

  const togglePlay = async () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }

      showControlsTemporarily();
    } catch (error) {
      console.error(
        "Unable to toggle playback:",
        error
      );
    }
  };

  const seek = (seconds: number) => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const max =
      Number.isFinite(video.duration)
        ? video.duration
        : Infinity;

    const nextTime = Math.max(
      0,
      Math.min(
        max,
        video.currentTime + seconds
      )
    );

    video.currentTime = nextTime;

    setCurrentTime(nextTime);

    showControlsTemporarily();
  };

  const handleProgressChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(
      event.target.value
    );

    const video = videoRef.current;

    if (video) {
      video.currentTime = value;
    }

    setCurrentTime(value);
  };

  const handleVolumeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(
      event.target.value
    );

    setVolume(value);

    const video = videoRef.current;

    if (video) {
      video.volume = value;
      video.muted = value === 0;
    }

    setMuted(value === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const nextMuted = !video.muted;

    video.muted = nextMuted;

    setMuted(nextMuted);
  };

  const changePlaybackRate = (
    rate: number
  ) => {
    setPlaybackRate(rate);

    if (videoRef.current) {
      videoRef.current.playbackRate =
        rate;
    }
  };

  const toggleFullscreen = async () => {
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
        "Fullscreen error:",
        error
      );
    }

    showControlsTemporarily();
  };

  // ----------------------------------------------------------
  // Subtitle search
  // ----------------------------------------------------------

  const searchSubtitles = async (
    language: string
  ) => {
    try {
      setSubtitleSearching(true);
      setSubtitleError(null);
      setSubtitleResults([]);

      const response = await fetch(
        `/api/subtitles/episodes/${encodeURIComponent(
          episodeId
        )}?language=${encodeURIComponent(
          language
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ??
            "Failed to search subtitles"
        );
      }

      setSubtitleResults(
        data.subtitles ?? []
      );
    } catch (error) {
      console.error(
        "Episode subtitle search failed:",
        error
      );

      setSubtitleError(
        error instanceof Error
          ? error.message
          : "Failed to search subtitles"
      );
    } finally {
      setSubtitleSearching(false);
    }
  };

  // ----------------------------------------------------------
  // Subtitle download
  // ----------------------------------------------------------

  const downloadSubtitle = async (
    subtitle: SubtitleSearchResult,
    language: string,
    label: string
  ) => {
    try {
      setSubtitleDownloading(true);
      setSubtitleError(null);

      const existing =
        subtitleTracks.find(
          (track) =>
            track.language ===
            language
        );

      if (existing) {
        setSelectedSubtitle(language);
        setSubtitleResults([]);
        return;
      }

      if (!subtitle.url) {
        throw new Error(
          "Subtitle URL is missing."
        );
      }

      const response = await fetch(
        `/api/subtitles/episodes/${encodeURIComponent(
          episodeId
        )}/download`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            fileUrl: subtitle.url,
            language,
          }),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ??
            "Failed to download subtitle"
        );
      }

      const track: SubtitleTrack = {
        language,
        label:
          data.subtitle?.label ??
          label,
        src:
          data.subtitle?.src ??
          `/api/subtitles/episodes/${episodeId}/${language}`,
      };

      setSubtitleTracks(
        (current) => [
          ...current.filter(
            (item) =>
              item.language !==
              language
          ),
          track,
        ]
      );

      setSubtitleResults([]);

      setSelectedSubtitle(language);
    } catch (error) {
      console.error(
        "Episode subtitle download failed:",
        error
      );

      setSubtitleError(
        error instanceof Error
          ? error.message
          : "Failed to download subtitle"
      );
    } finally {
      setSubtitleDownloading(false);
    }
  };

  // ----------------------------------------------------------
  // Activate subtitles
  // ----------------------------------------------------------

  useEffect(() => {
    const activateSubtitle = () => {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      for (
        let index = 0;
        index <
        video.textTracks.length;
        index++
      ) {
        video.textTracks[index].mode =
          "disabled";
      }

      if (
        selectedSubtitle === "off"
      ) {
        return;
      }

      const trackElement =
        subtitleTrackRefs.current[
          selectedSubtitle
        ];

      if (trackElement?.track) {
        trackElement.track.mode =
          "showing";

        return;
      }

      const selectedLanguage =
        selectedSubtitle
          .toLowerCase()
          .split("-")[0];

      for (
        let index = 0;
        index <
        video.textTracks.length;
        index++
      ) {
        const track =
          video.textTracks[index];

        const trackLanguage =
          track.language
            .toLowerCase()
            .split("-")[0];

        if (
          trackLanguage ===
          selectedLanguage
        ) {
          track.mode = "showing";
          return;
        }
      }
    };

    const frame =
      requestAnimationFrame(
        activateSubtitle
      );

    const timer =
      window.setTimeout(
        activateSubtitle,
        150
      );

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [
    selectedSubtitle,
    subtitleTracks,
  ]);

  // ----------------------------------------------------------
  // Change subtitle
  // ----------------------------------------------------------

  const changeSubtitle = (
    language: string
  ) => {
    setSelectedSubtitle(language);
    setSubtitleResults([]);
    setSubtitleError(null);

    if (language !== "off") {
      const video = videoRef.current;

      if (video) {
        for (
          let index = 0;
          index <
          video.textTracks.length;
          index++
        ) {
          video.textTracks[index].mode =
            "disabled";
        }

        const track =
          subtitleTrackRefs.current[
            language
          ];

        if (track?.track) {
          track.track.mode =
            "showing";
        }
      }
    }

    showControlsTemporarily();
  };

  // ----------------------------------------------------------
  // Subtitle menu
  // ----------------------------------------------------------

  const toggleSubtitleMenu = async (
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    const next =
      !subtitleMenuOpen;

    setSubtitleMenuOpen(next);

    if (
      next &&
      subtitleResults.length === 0 &&
      subtitleTracks.length === 0 &&
      !subtitleSearching
    ) {
      await searchSubtitles("en");
    }

    showControlsTemporarily();
  };

  // ----------------------------------------------------------
  // Time formatting
  // ----------------------------------------------------------

  const formatTime = (
    seconds: number
  ) => {
    if (
      !Number.isFinite(seconds)
    ) {
      return "0:00";
    }

    const total = Math.max(
      0,
      Math.floor(seconds)
    );

    const hours = Math.floor(
      total / 3600
    );

    const minutes = Math.floor(
      (total % 3600) / 60
    );

    const remaining =
      total % 60;

    if (hours > 0) {
      return `${hours}:${String(
        minutes
      ).padStart(
        2,
        "0"
      )}:${String(
        remaining
      ).padStart(
        2,
        "0"
      )}`;
    }

    return `${minutes}:${String(
      remaining
    ).padStart(2, "0")}`;
  };

  const progressPercent =
    duration > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (currentTime / duration) *
              100
          )
        )
      : 0;

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl bg-black shadow-2xl"
      onMouseMove={
        showControlsTemporarily
      }
      onClick={
        showControlsTemporarily
      }
    >
      <video
        ref={videoRef}
        src={`/api/videos/${episodeId}`}
        playsInline
        preload="metadata"
        className="aspect-video w-full bg-black object-contain"
        onDoubleClick={
          toggleFullscreen
        }
        onClick={(event) => {
          event.stopPropagation();
          togglePlay();
        }}
      >
        {subtitleTracks.map(
          (subtitle) => (
            <track
              key={`${subtitle.language}-${subtitle.src}`}
              ref={(element) => {
                subtitleTrackRefs.current[
                  subtitle.language
                ] = element;
              }}
              kind="subtitles"
              src={subtitle.src}
              srcLang={subtitle.language}
              label={subtitle.label}
              default={
                selectedSubtitle ===
                subtitle.language
              }
              onLoad={(event) => {
                const element =
                  event.currentTarget;

                if (
                  selectedSubtitle !==
                  subtitle.language
                ) {
                  return;
                }

                const video =
                  videoRef.current;

                if (!video) {
                  return;
                }

                for (
                  let index = 0;
                  index <
                  video.textTracks.length;
                  index++
                ) {
                  video.textTracks[
                    index
                  ].mode = "disabled";
                }

                element.track.mode =
                  "showing";
              }}
            />
          )
        )}
      </video>

      {!playing && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            togglePlay();
          }}
          aria-label="Play episode"
          className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-2xl transition hover:scale-105"
        >
          <Play className="ml-1 h-7 w-7 fill-current" />
        </button>
      )}

      {/* Subtitle menu */}
      {subtitleMenuOpen && (
        <div
          className="absolute bottom-20 right-4 z-40 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur-xl"
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          <div className="flex items-center justify-between border-b border-white/5 px-2 pb-2">
            <div className="flex items-center gap-2">
              <Captions className="h-4 w-4 text-white/60" />

              <span className="text-xs font-semibold text-white">
                Subtitles
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setSubtitleMenuOpen(
                  false
                )
              }
              className="rounded-md p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
              aria-label="Close subtitle menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Off */}
          <button
            type="button"
            onClick={() =>
              changeSubtitle("off")
            }
            className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            <span>Off</span>

            {selectedSubtitle ===
              "off" && (
              <Check className="h-4 w-4 text-red-500" />
            )}
          </button>

          {/* Downloaded */}
          {subtitleTracks.map(
            (subtitle) => (
              <button
                key={`${subtitle.language}-${subtitle.src}`}
                type="button"
                onClick={() =>
                  changeSubtitle(
                    subtitle.language
                  )
                }
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <span>
                  {subtitle.label}
                </span>

                {selectedSubtitle ===
                  subtitle.language && (
                  <Check className="h-4 w-4 text-red-500" />
                )}
              </button>
            )
          )}

          {/* Searching */}
          {subtitleSearching && (
            <div className="flex items-center gap-2 px-3 py-4 text-xs text-white/40">
              <div className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white/80" />

              Searching subtitles...
            </div>
          )}

          {/* Results */}
          {!subtitleSearching &&
            subtitleResults.length >
              0 && (
              <div className="mt-2 border-t border-white/5 pt-2">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  Available subtitles
                </div>

                <div className="max-h-56 overflow-y-auto">
                  {subtitleResults.map(
                    (subtitle) => (
                      <button
                        key={`${subtitle.fileId}-${subtitle.url}`}
                        type="button"
                        disabled={
                          subtitleDownloading
                        }
                        onClick={() =>
                          downloadSubtitle(
                            subtitle,
                            subtitle.language,
                            subtitle.label
                          )
                        }
                        className="mt-1 w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-medium text-white">
                              {
                                subtitle.label
                              }
                            </div>

                            {subtitle.release && (
                              <div className="mt-1 truncate text-[10px] text-white/35">
                                {
                                  subtitle.release
                                }
                              </div>
                            )}

                            {subtitle.fileName && (
                              <div className="mt-1 truncate text-[10px] text-white/25">
                                {
                                  subtitle.fileName
                                }
                              </div>
                            )}
                          </div>

                          <span className="shrink-0 text-[10px] text-white/30">
                            {subtitleDownloading
                              ? "..."
                              : "Use"}
                          </span>
                        </div>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

          {/* Search */}
          {!subtitleSearching && (
            <div className="mt-2 border-t border-white/5 pt-2">
              <button
                type="button"
                onClick={() =>
                  searchSubtitles("en")
                }
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-white/50 transition hover:bg-white/5 hover:text-white"
              >
                <Search className="h-3.5 w-3.5" />
                Search English
              </button>

              <button
                type="button"
                onClick={() =>
                  searchSubtitles("si")
                }
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-white/50 transition hover:bg-white/5 hover:text-white"
              >
                <Search className="h-3.5 w-3.5" />
                Search Sinhala
              </button>
            </div>
          )}

          {subtitleError && (
            <div className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-[10px] leading-4 text-red-400">
              {subtitleError}
            </div>
          )}

          {!subtitleSearching &&
            subtitleResults.length === 0 &&
            subtitleTracks.length === 0 &&
            !subtitleError && (
              <div className="px-3 py-4 text-xs text-white/30">
                No subtitles found.
              </div>
            )}
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-4 pt-12 transition-opacity duration-300 ${
          showControls
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(
            currentTime,
            duration || 0
          )}
          onChange={
            handleProgressChange
          }
          aria-label="Video progress"
          className="mb-3 h-1 w-full cursor-pointer accent-red-600"
          style={{
            background: `linear-gradient(to right, #dc2626 ${progressPercent}%, rgba(255,255,255,0.25) ${progressPercent}%)`,
          }}
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              togglePlay();
            }}
            aria-label={
              playing ? "Pause" : "Play"
            }
            className="rounded-full p-1.5 text-white transition hover:bg-white/10"
          >
            {playing ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current" />
            )}
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              seek(-10);
            }}
            aria-label="Back 10 seconds"
            className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              seek(10);
            }}
            aria-label="Forward 10 seconds"
            className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <RotateCw className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleMute();
              }}
              aria-label={
                muted ? "Unmute" : "Mute"
              }
              className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
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
              step={0.05}
              value={
                muted ? 0 : volume
              }
              onChange={
                handleVolumeChange
              }
              aria-label="Volume"
              className="hidden w-20 cursor-pointer accent-white sm:block"
            />
          </div>

          <div className="text-xs text-white/60">
            {formatTime(currentTime)} /{" "}
            {formatTime(duration)}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={
                toggleSubtitleMenu
              }
              aria-label="Subtitles"
              aria-expanded={
                subtitleMenuOpen
              }
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition ${
                selectedSubtitle !==
                "off"
                  ? "bg-red-600 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"
              }`}
            >
              <Captions className="h-4 w-4" />

              <span className="hidden sm:inline">
                {selectedSubtitle ===
                "off"
                  ? "CC"
                  : selectedSubtitle ===
                      "en"
                    ? "EN"
                    : selectedSubtitle ===
                        "si"
                      ? "SI"
                      : selectedSubtitle}
              </span>
            </button>

            <div className="relative">
              <select
                value={playbackRate}
                onChange={(event) =>
                  changePlaybackRate(
                    Number(
                      event.target.value
                    )
                  )
                }
                onClick={(event) =>
                  event.stopPropagation()
                }
                aria-label="Playback speed"
                className="appearance-none rounded-lg bg-white/10 px-2 py-1.5 pr-7 text-xs text-white outline-none transition hover:bg-white/15"
              >
                <option
                  value={0.5}
                  className="bg-zinc-900"
                >
                  0.5x
                </option>

                <option
                  value={0.75}
                  className="bg-zinc-900"
                >
                  0.75x
                </option>

                <option
                  value={1}
                  className="bg-zinc-900"
                >
                  1x
                </option>

                <option
                  value={1.25}
                  className="bg-zinc-900"
                >
                  1.25x
                </option>

                <option
                  value={1.5}
                  className="bg-zinc-900"
                >
                  1.5x
                </option>

                <option
                  value={2}
                  className="bg-zinc-900"
                >
                  2x
                </option>
              </select>

              <Settings className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/50" />
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void toggleFullscreen();
              }}
              aria-label="Fullscreen"
              className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-2 truncate text-xs text-white/50">
          {seriesTitle} • S
          {String(
            seasonNumber
          ).padStart(2, "0")}{" "}
          E
          {String(
            episodeNumber
          ).padStart(2, "0")}{" "}
          • {title}
        </div>
      </div>
    </div>
  );
}
