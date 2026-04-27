"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/lib/store";

export function CelebrationOverlay() {
  const { pendingEvent, clearEvent } = useGameStore();

  useEffect(() => {
    if (!pendingEvent) return;
    const t = setTimeout(clearEvent, pendingEvent.leveledUp ? 3000 : 1800);
    return () => clearTimeout(t);
  }, [pendingEvent, clearEvent]);

  return (
    <AnimatePresence>
      {pendingEvent && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {pendingEvent.leveledUp ? (
            <motion.div
              initial={{ scale: 0.5, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -20, opacity: 0 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
              className="flex flex-col items-center gap-3 rounded-chunky border-2 border-primary bg-card px-10 py-8 shadow-chunky-primary"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-5xl"
              >
                ⭐
              </motion.div>
              <p className="text-2xl font-bold text-primary">Level up!</p>
              <p className="text-muted-foreground">
                You reached level {pendingEvent.newLevel}
              </p>
              <XpBurst xp={pendingEvent.xpGained} />
            </motion.div>
          ) : (
            <XpBurst xp={pendingEvent.xpGained} large />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function XpBurst({ xp, large }: { xp: number; large?: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0.6, y: 10, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 1.2, y: -30, opacity: 0 }}
      transition={{ type: "spring" as const, stiffness: 400, damping: 18 }}
      className={`rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground ${large ? "text-2xl" : "text-base"}`}
    >
      +{xp} XP
    </motion.div>
  );
}
