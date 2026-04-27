import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { NormalizedContent, TimestampedSegment } from "@/server/ingest/types";

const execFileAsync = promisify(execFile);

const YT_URL_RE =
  /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractVideoId(url: string): string {
  const match = YT_URL_RE.exec(url);
  if (!match?.[1]) throw new Error("Invalid YouTube URL — could not extract video ID.");
  return match[1];
}

function vttTimeToSeconds(time: string): number {
  const [hms, ms] = time.split(".");
  const parts = (hms ?? "").split(":").map(Number);
  const [h = 0, m = 0, s = 0] =
    parts.length === 3 ? parts : [0, ...(parts as [number, number])];
  return h * 3600 + m * 60 + s + parseInt(ms ?? "0", 10) / 1000;
}

function parseVtt(vttContent: string): TimestampedSegment[] {
  const segments: TimestampedSegment[] = [];
  const blocks = vttContent.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) continue;

    const [startStr, endStr] = timeLine.split("-->").map((s) => s.trim());
    if (!startStr || !endStr) continue;

    const text = lines
      .filter((l) => !l.includes("-->") && l !== "WEBVTT" && !/^\d+$/.test(l.trim()))
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .trim();

    if (!text) continue;

    segments.push({
      startSeconds: vttTimeToSeconds(startStr),
      endSeconds: vttTimeToSeconds(endStr),
      text,
    });
  }

  return segments;
}

function mergeSegments(segments: TimestampedSegment[]): TimestampedSegment[] {
  // Merge adjacent segments into ~30-second chunks to reduce noise
  const merged: TimestampedSegment[] = [];
  let current: TimestampedSegment | null = null;

  for (const seg of segments) {
    if (!current) {
      current = { ...seg };
      continue;
    }
    if (seg.endSeconds - current.startSeconds <= 30) {
      current.endSeconds = seg.endSeconds;
      current.text += " " + seg.text;
    } else {
      merged.push(current);
      current = { ...seg };
    }
  }
  if (current) merged.push(current);
  return merged;
}

export async function ingestYouTube(
  url: string
): Promise<Extract<NormalizedContent, { kind: "youtube" }>> {
  const videoId = extractVideoId(url);
  const outTemplate = join(tmpdir(), `tg-${videoId}.%(ext)s`);
  const vttPath = join(tmpdir(), `tg-${videoId}.en.vtt`);

  let ytdlpPath: string;
  try {
    const { stdout } = await execFileAsync("which", ["yt-dlp"]);
    ytdlpPath = stdout.trim();
  } catch {
    throw new Error(
      "yt-dlp is not installed. Run: brew install yt-dlp (macOS) or pip install yt-dlp"
    );
  }

  let metadata: { title: string; duration: number };
  try {
    const { stdout } = await execFileAsync(ytdlpPath, [
      "--write-auto-sub",
      "--sub-lang",
      "en",
      "--sub-format",
      "vtt",
      "--skip-download",
      "--print",
      "%(title)s\n%(duration)s",
      "--output",
      outTemplate,
      "--",
      videoId,
    ]);
    const [title = "Untitled", durationStr = "0"] = stdout.trim().split("\n");
    metadata = { title, duration: parseInt(durationStr, 10) };
  } catch (err) {
    throw new Error(
      `yt-dlp failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  let vttContent: string;
  try {
    vttContent = await readFile(vttPath, "utf-8");
  } catch {
    throw new Error(
      "No English captions found for this video. Try a video with auto-generated or manual captions."
    );
  }

  // Clean up the subtitle file
  await unlink(vttPath).catch(() => undefined);

  const rawSegments = parseVtt(vttContent);
  if (rawSegments.length === 0) {
    throw new Error("Could not parse any transcript segments from this video's captions.");
  }

  return {
    kind: "youtube",
    videoId,
    title: metadata.title,
    durationSeconds: metadata.duration,
    transcript: mergeSegments(rawSegments),
  };
}
