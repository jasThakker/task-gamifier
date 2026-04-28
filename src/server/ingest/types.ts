export type TimestampedSegment = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export type NormalizedContent =
  | { kind: "text"; text: string; title: string }
  | {
      kind: "youtube";
      videoId: string;
      title: string;
      durationSeconds: number;
      transcript: TimestampedSegment[];
    }
  | { kind: "pdf"; title: string; pageTexts: string[]; totalPages: number };
