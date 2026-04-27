import type { NormalizedContent } from "@/server/ingest/types";

export function ingestText(
  title: string,
  text: string
): Extract<NormalizedContent, { kind: "text" }> {
  const normalized = text.trim();
  if (normalized.length < 50) {
    throw new Error("Text is too short to break into sessions (minimum 50 characters).");
  }
  return { kind: "text", title, text: normalized };
}
