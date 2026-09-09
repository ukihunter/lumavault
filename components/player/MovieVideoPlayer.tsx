
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Captions,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";

type SubtitleTrack = {
  language: string;
  label: string;
  src: string;
  default?: boolean;
};

type MovieVideoPlayerProps = {
  movieId: string;
  title: string;
  poster?: string | null;
};

export function MovieVideoPlayer({
  movieId,
  title,
  poster,
}: MovieVideoPlayerProps) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [playing, setPlaying] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  const [volume, setVolume] =
    useState(1);

  const [muted, setMuted] =
    useState(false);

  const [showControls, setShowControls] =
    useState(true);

  const [playbackRate, setPlaybackRate] =
    useState(1);

  const [subtitles, setSubtitles] =
    useState<SubtitleTrack[]>([]);

  const [subtitlesLoading, setSubtitlesLoading] =
    useState(false);

  const [subtitleError, setSubtitleError] =
    useState<string | null>(null);

  const [selectedSubtitle, setSelectedSubtitle] =
    useState("off");

  const controlsTimeout =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  /* ---------------------------------------------------------------------- */
  /* Load saved movie position                                               */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    const saved =
      localStorage.getItem(
        `lumavault-movie-${movieId}`,
      );

    if (!saved) {
      return;
    }

    const position = Number(saved);

    if (
      !Number.isFinite(position) ||
      position <= 0
    ) {
      return;
    }

    const restore = () => {
      if (
        Number.isFinite(
          video.duration,
        ) &&
        position <
          video.duration - 5
      ) {
        video.currentTime =
          position;
      }
    };

    if (
      video.readyState >= 1
    ) {
      restore();
    } else {
      video.addEventListener(
        "loadedmetadata",
        restore,
        {
          once: true,
        },
      );

      return () =>
        video.removeEventListener(
          "loadedmetadata",
          restore,
        );
    }
  }, [movieId]);

  /* ---------------------------------------------------------------------- */
  /* Load subtitles                                                          */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function loadSubtitles() {
      try {
        setSubtitlesLoading(true);
        setSubtitleError(null);

        const response =
          await fetch(
            `/api/subtitles/movies/${movieId}`,
            {
              cache: "no-store",
            },
          );

        if (!response.ok) {
          throw new Error(
            "Failed to load subtitles",
          );
        }

        const data =
          await response.json();

        if (!data.success) {
          throw new Error(
            data.error ??
              "Failed to load subtitles",
          );
        }

        if (!cancelled) {
          setSubtitles(
            data.subtitles ?? [],
          );
        }
      } catch (error) {
        console.error(
          "Subtitle loading failed:",
          error,
        );

        if (!cancelled) {
          setSubtitles([]);
          setSubtitleError(
            error instanceof Error
              ? error.message
              : "Failed to load subtitles",
          );
        }
      } finally {
        if (!cancelled) {
          setSubtitlesLoading(false);
        }
      }
    }

    loadSubtitles();

    return () => {
      cancelled = true;
    };
  }, [movieId]);

  /* ---------------------------------------------------------------------- */
  /* Save progress                                                           */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    const saveProgress = () => {
      if (
        video.currentTime > 0 &&
        !Number.isNaN(
          video.currentTime,
        )
      ) {
        localStorage.setItem(
          `lumavault-movie-${movieId}`,
          String(
            Math.floor(
              video.currentTime,
            ),
          ),
        );
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(
        video.currentTime,
      );
    };

    const handleLoadedMetadata = () => {
      setDuration(
        Number.isFinite(
          video.duration,
        )
          ? video.duration
          : 0,
      );
    };

    const handlePlay = () => {
      setPlaying(true);
    };

    const handlePause = () => {
      setPlaying(false);
      saveProgress();
    };

    const handleEnded = () => {
      setPlaying(false);

      localStorage.removeItem(
        `lumavault-movie-${movieId}`,
      );
    };

    video.addEventListener(
      "timeupdate",
      handleTimeUpdate,
    );

    video.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata,
    );

    video.addEventListener(
      "play",
      handlePlay,
    );

    video.addEventListener(
      "pause",
      handlePause,
    );

    video.addEventListener(
      "ended",
      handleEnded,
    );

    const interval =
      window.setInterval(
        saveProgress,
        5000,
      );

    return () => {
      window.clearInterval(
        interval,
      );

      saveProgress();

      video.removeEventListener(
        "timeupdate",
        handleTimeUpdate,
      );

      video.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata,
      );

      video.removeEventListener(
        "play",
        handlePlay,
      );

      video.removeEventListener(
        "pause",
        handlePause,
      );

      video.removeEventListener(
        "ended",
        handleEnded,
      );
    };
  }, [movieId]);

  /* ---------------------------------------------------------------------- */
  /* Controls                                                                */
  /* ---------------------------------------------------------------------- */

  const showControlsTemporarily =
    () => {
      setShowControls(true);

      if (
        controlsTimeout.current
      ) {
        clearTimeout(
          controlsTimeout.current,
        );
      }

      controlsTimeout.current =
        setTimeout(() => {
          if (
            videoRef.current &&
            !videoRef.current.paused
          ) {
            setShowControls(false);
          }
        }, 2500);
    };

  const togglePlay = async () => {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      await video.play();
    } else {
      video.pause();
    }

    showControlsTemporarily();
  };

  const seek = (
    seconds: number,
  ) => {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    video.currentTime =
      Math.max(
        0,
        Math.min(
          video.duration || Infinity,
          video.currentTime +
            seconds,
        ),
      );

    showControlsTemporarily();
  };

  const handleProgressChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value =
      Number(event.target.value);

    if (videoRef.current) {
      videoRef.current.currentTime =
        value;
    }

    setCurrentTime(value);
  };

  const handleVolumeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value =
      Number(event.target.value);

    setVolume(value);

    if (videoRef.current) {
      videoRef.current.volume =
        value;

      videoRef.current.muted =
        value === 0;
    }

    setMuted(
      value === 0,
    );
  };

  const toggleMute = () => {
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

  const changePlaybackRate = (
    rate: number,
  ) => {
    setPlaybackRate(rate);

    if (videoRef.current) {
      videoRef.current.playbackRate =
        rate;
    }
  };

  const toggleFullscreen =
    async () => {
      const container =
        containerRef.current;

      if (!container) {
        return;
      }

      if (
        document.fullscreenElement
      ) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }

      showControlsTemporarily();
    };

  /* ---------------------------------------------------------------------- */
  /* Subtitle handling                                                       */
  /* ---------------------------------------------------------------------- */

  const changeSubtitle = (
    language: string,
  ) => {
    setSelectedSubtitle(
      language,
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

    if (language === "off") {
      return;
    }

    for (
      let index = 0;
      index < tracks.length;
      index++
    ) {
      const track =
        tracks[index];

      if (
        track.language ===
        language
      ) {
        track.mode =
          "showing";
        break;
      }
    }

    showControlsTemporarily();
  };

  const formatTime = (
    seconds: number,
  ) => {
    if (
      !Number.isFinite(seconds)
    ) {
      return "0:00";
    }

    const total =
      Math.max(
        0,
        Math.floor(seconds),
      );

    const hours =
      Math.floor(
        total / 3600,
      );

    const minutes =
      Math.floor(
        (total % 3600) / 60,
      );

    const remaining =
      total % 60;

    if (hours > 0) {
      return `${hours}:${String(
        minutes,
      ).padStart(
        2,
        "0",
      )}:${String(
        remaining,
      ).padStart(
        2,
        "0",
      )}`;
    }

    return `${minutes}:${String(
      remaining,
    ).padStart(
      2,
      "0",
    )}`;
  };

  return (
    <div
      ref={containerRef}
      className="
        relative
        overflow-hidden
        rounded-2xl
        bg-black
        shadow-2xl
      "
      onMouseMove={
        showControlsTemporarily
      }
      onClick={
        showControlsTemporarily
      }
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={`/api/videos/movies/${movieId}`}
        poster={
          poster ?? undefined
        }
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        className="
          aspect-video
          w-full
          bg-black
          object-contain
        "
        onDoubleClick={
          toggleFullscreen
        }
        onClick={(event) => {
          event.stopPropagation();
          togglePlay();
        }}
      >
        {/* Subtitle tracks */}
        {subtitles.map(
          (subtitle) => (
            <track
              key={`${subtitle.language}-${subtitle.src}`}
              kind="subtitles"
              src={subtitle.src}
              srcLang={
                subtitle.language
              }
              label={subtitle.label}
              default={
                subtitle.default ??
                false
              }
            />
          ),
        )}
      </video>

      {/* Center play */}
      {!playing && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            togglePlay();
          }}
          aria-label="Play movie"
          className="
            absolute
            left-1/2
            top-1/2
            z-10
            flex
            h-16
            w-16
            -translate-x-1/2
            -translate-y-1/2
            items-center
            justify-center
            rounded-full
            bg-white
            text-black
            shadow-2xl
            transition
            hover:scale-105
          "
        >
          <Play className="ml-1 h-7 w-7 fill-current" />
        </button>
      )}

      {/* Controls */}
      <div
        className={`
          absolute
          inset-x-0
          bottom-0
          z-20
          bg-gradient-to-t
          from-black
          via-black/80
          to-transparent
          px-4
          pb-4
          pt-12
          transition-opacity
          duration-300
          ${
            showControls
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          }
        `}
      >
        {/* Progress */}
        <input
          type="range"
          min={0}
          max={
            duration || 0
          }
          step={0.1}
          value={Math.min(
            currentTime,
            duration || 0,
          )}
          onChange={
            handleProgressChange
          }
          aria-label="Video progress"
          className="
            mb-3
            h-1
            w-full
            cursor-pointer
            accent-red-600
          "
        />

        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              togglePlay();
            }}
            aria-label={
              playing
                ? "Pause"
                : "Play"
            }
            className="
              rounded-full
              p-1.5
              text-white
              transition
              hover:bg-white/10
            "
          >
            {playing ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current" />
            )}
          </button>

          {/* Back 10 */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              seek(-10);
            }}
            aria-label="Back 10 seconds"
            className="
              rounded-full
              p-1.5
              text-white/80
              transition
              hover:bg-white/10
              hover:text-white
            "
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          {/* Forward 10 */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              seek(10);
            }}
            aria-label="Forward 10 seconds"
            className="
              rounded-full
              p-1.5
              text-white/80
              transition
              hover:bg-white/10
              hover:text-white
            "
          >
            <RotateCw className="h-5 w-5" />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleMute();
              }}
              aria-label={
                muted
                  ? "Unmute"
                  : "Mute"
              }
              className="
                rounded-full
                p-1.5
                text-white/80
                transition
                hover:bg-white/10
                hover:text-white
              "
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
                muted
                  ? 0
                  : volume
              }
              onChange={
                handleVolumeChange
              }
              aria-label="Volume"
              className="
                hidden
                w-20
                cursor-pointer
                accent-white
                sm:block
              "
            />
          </div>

          {/* Time */}
          <div className="text-xs text-white/60">
            {formatTime(
              currentTime,
            )}{" "}
            /{" "}
            {formatTime(
              duration,
            )}
          </div>

          <div className="ml-auto flex items-center gap-1">
            {/* Subtitles */}
            <div className="relative">
              <label
                htmlFor="subtitle-language"
                className="sr-only"
              >
                Subtitles
              </label>

              <div
                className="
                  flex
                  items-center
                  gap-1
                  rounded-lg
                  bg-white/10
                  px-2
                  py-1.5
                  transition
                  hover:bg-white/15
                "
              >
                <Captions className="h-4 w-4 text-white/70" />

                <select
                  id="subtitle-language"
                  value={
                    selectedSubtitle
                  }
                  onChange={(event) =>
                    changeSubtitle(
                      event.target
                        .value,
                    )
                  }
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                  disabled={
                    subtitlesLoading
                  }
                  className="
                    max-w-[110px]
                    appearance-none
                    bg-transparent
                    text-xs
                    text-white
                    outline-none
                    disabled:opacity-50
                  "
                  aria-label="Subtitles"
                >
                  <option
                    value="off"
                    className="bg-zinc-900"
                  >
                    {subtitlesLoading
                      ? "Loading..."
                      : "Off"}
                  </option>

                  {subtitles.map(
                    (subtitle) => (
                      <option
                        key={`${subtitle.language}-${subtitle.src}`}
                        value={
                          subtitle.language
                        }
                        className="bg-zinc-900"
                      >
                        {subtitle.label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {subtitleError && (
                <div
                  className="
                    pointer-events-none
                    absolute
                    bottom-full
                    right-0
                    mb-2
                    hidden
                    w-52
                    rounded-lg
                    border
                    border-white/10
                    bg-zinc-950
                    px-3
                    py-2
                    text-[10px]
                    text-white/50
                    shadow-xl
                    sm:block
                  "
                >
                  {subtitleError}
                </div>
              )}
            </div>

            {/* Playback speed */}
            <div className="relative">
              <select
                value={
                  playbackRate
                }
                onChange={(event) =>
                  changePlaybackRate(
                    Number(
                      event.target
                        .value,
                    ),
                  )
                }
                onClick={(event) =>
                  event.stopPropagation()
                }
                aria-label="Playback speed"
                className="
                  appearance-none
                  rounded-lg
                  bg-white/10
                  px-2
                  py-1.5
                  pr-7
                  text-xs
                  text-white
                  outline-none
                  transition
                  hover:bg-white/15
                "
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

              <Settings
                className="
                  pointer-events-none
                  absolute
                  right-2
                  top-1/2
                  h-3
                  w-3
                  -translate-y-1/2
                  text-white/50
                "
              />
            </div>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleFullscreen();
              }}
              aria-label="Fullscreen"
              className="
                rounded-full
                p-1.5
                text-white/80
                transition
                hover:bg-white/10
                hover:text-white
              "
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mt-2 truncate text-xs text-white/50">
          {title}
        </div>
      </div>
    </div>
  );
}

