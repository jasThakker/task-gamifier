"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Lottie from "lottie-react";
import { useGameStore } from "@/lib/store";
import celebrationData from "../../../public/lotties/celebration.json";

export function CelebrationOverlay() {
  const { pendingEvent, clearEvent } = useGameStore();

  useEffect(() => {
    if (!pendingEvent) return;
    const t = setTimeout(clearEvent, pendingEvent.leveledUp ? 3200 : 2000);
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
          {/* Lottie burst always plays */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Lottie
              animationData={celebrationData}
              loop={false}
              className="w-72 h-72 opacity-90"
            />
          </div>

          {pendingEvent.leveledUp ? (
            <motion.div
              initial={{ scale: 0.5, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -20, opacity: 0 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
              className="relative flex flex-col items-center gap-3 rounded-chunky border-2 border-primary bg-card px-10 py-8 shadow-chunky-primary"
            >
              <motion.span
                animate={{ rotate: [0, -12, 12, -12, 12, 0] }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-5xl"
              >
                ⭐
              </motion.span>
              <p className="text-2xl font-extrabold text-primary">Level up!</p>
              <p className="text-muted-foreground font-semibold">
                You reached level {pendingEvent.newLevel}
              </p>
              <XpBadge xp={pendingEvent.xpGained} />
            </motion.div>
          ) : (
            <XpBadge xp={pendingEvent.xpGained} large />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function XpBadge({ xp, large }: { xp: number; large?: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0.6, y: 10, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 1.2, y: -30, opacity: 0 }}
      transition={{ type: "spring" as const, stiffness: 400, damping: 18 }}
      className={`relative rounded-full border-2 border-[oklch(0.50_0.14_165)] bg-primary px-6 py-2 font-extrabold text-primary-foreground shadow-chunky-primary ${large ? "text-2xl" : "text-base"}`}
    >
      +{xp} XP
    </motion.div>
  );
}
