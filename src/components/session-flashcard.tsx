"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Session } from "@/server/db/schema";

export function SessionFlashcard({ session }: { session: Session }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative cursor-pointer"
      style={{ perspective: "1200px" }}
      onClick={() => setFlipped((f) => !f)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: "preserve-3d", position: "relative" }}
      >
        {/* Front — sets the height naturally */}
        <div
          className="rounded-chunky border-2 border-border bg-card p-6 shadow-chunky"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl font-extrabold leading-tight">{session.title}</h1>
              <span className="shrink-0 rounded-full border-2 border-border bg-muted px-2.5 py-0.5 text-xs font-bold">
                ~{session.estimatedMinutes} min
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Focus</p>
              <p className="text-sm leading-relaxed">{session.focusGoal}</p>
            </div>

            <div className="space-y-1 rounded-xl bg-muted/50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Outcome</p>
              <p className="text-sm leading-relaxed">{session.outcomeStatement}</p>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Tap to flip — see objectives & concepts →
            </p>
          </div>
        </div>

        {/* Back — absolutely positioned, same size as front */}
        <div
          className="absolute inset-0 rounded-chunky border-2 border-primary bg-card p-6 shadow-chunky-primary"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex flex-col gap-4 h-full">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Learning objectives</p>
              <ul className="space-y-2">
                {session.learningObjectives.map((obj, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-snug">
                    <span className="shrink-0 font-bold text-primary">→</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {session.keyConcepts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Key concepts</p>
                <div className="flex flex-wrap gap-1.5">
                  {session.keyConcepts.map((concept, i) => (
                    <span key={i} className="rounded-full border-2 border-border bg-muted px-2.5 py-0.5 text-xs font-semibold">
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-auto text-center text-xs text-muted-foreground">← Tap to flip back</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
