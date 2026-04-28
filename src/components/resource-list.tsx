"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Resource } from "@/server/db/schema";
import { buttonVariants } from "@/components/ui/button";

const SOURCE_LABELS: Record<string, string> = {
  text: "Text",
  youtube_video: "YouTube",
  youtube_playlist: "Playlist",
  pdf: "PDF",
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

type ResourceWithCounts = Resource & { sessionCount: number; completedCount: number };

export function ResourceList({ resources }: { resources: ResourceWithCounts[] }) {
  if (resources.length === 0) {
    return (
      <div className="rounded-chunky border-2 border-dashed border-primary/30 bg-primary/5 py-16 text-center space-y-5">
        <div className="text-5xl">📚</div>
        <div className="space-y-1.5">
          <p className="font-bold text-lg">No resources yet</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Add a YouTube video, PDF, or paste any text to break it into bite-sized study sessions.
          </p>
        </div>
        <Link href="/resources/new" className={buttonVariants()}>
          Add your first resource →
        </Link>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
      {resources.map((r) => {
        const pct = r.sessionCount > 0
          ? Math.round((r.completedCount / r.sessionCount) * 100)
          : 0;
        return (
          <motion.div key={r.id} variants={fadeUp}>
            <Link href={`/resources/${r.id}`} className="card-playful block p-4 hover:bg-accent">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-bold leading-snug truncate">{r.title}</p>
                  {r.status === "failed" && (
                    <p className="text-xs text-destructive mt-0.5">Failed to process</p>
                  )}
                </div>
                <span className="shrink-0 rounded-full border-2 border-border bg-muted px-2.5 py-0.5 text-xs font-semibold">
                  {SOURCE_LABELS[r.sourceType] ?? r.sourceType}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {r.completedCount}/{r.sessionCount}
                </span>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
