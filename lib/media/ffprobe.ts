import "server-only";

import { spawn } from "node:child_process";

export type MediaAudioTrack = {
  streamIndex: number;
  trackIndex: number;
  language: string;
  label: string;
  title: string | null;
  codec: string;
  channels: number | null;
  channelLayout: string | null;
  sampleRate: number | null;
  default: boolean;
};

export type MediaSubtitleTrack = {
  streamIndex: number;
  trackIndex: number;
  language: string;
  label: string;
  title: string | null;
  codec: string;
  default: boolean;
  forced: boolean;
  hearingImpaired: boolean;
  textBased: boolean;
};

type FfprobeStream = {
  index?: number;
  codec_type?: string;
  codec_name?: string;
  codec_long_name?: string;
  tags?: {
    language?: string;
    title?: string;
  };
  disposition?: {
    default?: number;
    forced?: number;
    hearing_impaired?: number;
  };
  channels?: number;
  channel_layout?: string;
  sample_rate?: string;
};

type FfprobeOutput = {
  streams?: FfprobeStream[];
};

const TEXT_SUBTITLE_CODECS = new Set([
  "subrip",
  "srt",
  "ass",
  "ssa",
  "webvtt",
  "mov_text",
  "text",
  "microdvd",
  "jacosub",
  "mpl2",
  "sami",
  "realtext",
  "stl",
]);

function runFfprobe(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn("ffprobe", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    process.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    process.on("error", (error) => {
      reject(
        new Error(
          `Unable to start ffprobe. Is ffmpeg/ffprobe installed? ${error.message}`,
        ),
      );
    });

    process.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `ffprobe failed with exit code ${code}: ${stderr.trim()}`,
          ),
        );
        return;
      }

      resolve(stdout);
    });
  });
}

function normalizeLanguage(language?: string): string {
  if (!language) {
    return "und";
  }

  return language.trim().toLowerCase();
}

function languageLabel(language: string): string {
  const normalized = language.toLowerCase();

  const names: Record<string, string> = {
    eng: "English",
    en: "English",
    sin: "Sinhala",
    si: "Sinhala",
    tam: "Tamil",
    ta: "Tamil",
    jpn: "Japanese",
    ja: "Japanese",
    kor: "Korean",
    ko: "Korean",
    chi: "Chinese",
    zho: "Chinese",
    zh: "Chinese",
    spa: "Spanish",
    es: "Spanish",
    fra: "French",
    fr: "French",
    deu: "German",
    ger: "German",
    de: "German",
    ita: "Italian",
    pt: "Portuguese",
    por: "Portuguese",
    rus: "Russian",
    ara: "Arabic",
    hin: "Hindi",
    und: "Unknown",
  };

  return names[normalized] ?? language.toUpperCase();
}

export async function probeMediaFile(
  filePath: string,
): Promise<{
  audio: MediaAudioTrack[];
  subtitles: MediaSubtitleTrack[];
}> {
  const output = await runFfprobe([
    "-v",
    "error",
    "-show_streams",
    "-of",
    "json",
    filePath,
  ]);

  const parsed = JSON.parse(output) as FfprobeOutput;

  const audio: MediaAudioTrack[] = [];
  const subtitles: MediaSubtitleTrack[] = [];

  let audioTrackIndex = 0;
  let subtitleTrackIndex = 0;

  for (const stream of parsed.streams ?? []) {
    if (typeof stream.index !== "number") {
      continue;
    }

    const language = normalizeLanguage(
      stream.tags?.language,
    );

    const title =
      stream.tags?.title?.trim() || null;

    const label = title
      ? `${languageLabel(language)} • ${title}`
      : languageLabel(language);

    if (stream.codec_type === "audio") {
      audio.push({
        streamIndex: stream.index,
        trackIndex: audioTrackIndex,
        language,
        label,
        title,
        codec: stream.codec_name ?? "unknown",
        channels:
          typeof stream.channels === "number"
            ? stream.channels
            : null,
        channelLayout:
          stream.channel_layout ?? null,
        sampleRate: stream.sample_rate
          ? Number(stream.sample_rate)
          : null,
        default:
          stream.disposition?.default === 1,
      });

      audioTrackIndex += 1;
      continue;
    }

    if (stream.codec_type === "subtitle") {
      const codec =
        stream.codec_name?.toLowerCase() ?? "unknown";

      subtitles.push({
        streamIndex: stream.index,
        trackIndex: subtitleTrackIndex,
        language,
        label,
        title,
        codec,
        default:
          stream.disposition?.default === 1,
        forced:
          stream.disposition?.forced === 1,
        hearingImpaired:
          stream.disposition?.hearing_impaired === 1,
        textBased: TEXT_SUBTITLE_CODECS.has(codec),
      });

      subtitleTrackIndex += 1;
    }
  }

  return {
    audio,
    subtitles,
  };
}

export function getLanguageLabel(
  language: string,
): string {
  return languageLabel(normalizeLanguage(language));
}