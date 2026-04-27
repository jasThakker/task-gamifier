"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { User, Session, Resource } from "@/server/db/schema";
import { progressToNextLevel } from "@/lib/xp";
import { buttonVariants } from "@/components/ui/button";
import { StreakBadge } from "@/components/gamification/streak-badge";
import { LevelBadge } from "@/components/gamification/level-badge";
import { XpBar } from "@/components/gamification/xp-bar";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

interface Props {
  user: User;
  nextUp: Array<{ session: Session; resource: Resource }>;
}

export function DashboardContent({ user, nextUp }: Props) {
  const xpProgress = progressToNextLevel(user.xp);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={fadeUp} className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground">Keep the streak going — every session counts.</p>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
        <div className="card-playful p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Streak</span>
          <StreakBadge streak={user.currentStreak} className="text-2xl" />
          <span className="text-xs text-muted-foreground">best: {user.longestStreak} days</span>
        </div>

        <div className="card-playful p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Level</span>
          <LevelBadge level={xpProgress.level} className="text-2xl justify-start px-0 bg-transparent" />
          <span className="text-xs text-muted-foreground">{user.xp} total XP</span>
        </div>

        <div className="card-playful p-4 flex flex-col gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Next level</span>
          <XpBar
            xpIntoLevel={xpProgress.xpIntoLevel}
            xpNeededForNext={xpProgress.xpNeededForNext}
            progressPercent={xpProgress.progressPercent}
          />
          <span className="text-xs text-muted-foreground">
            {xpProgress.xpNeededForNext - xpProgress.xpIntoLevel} XP to go
          </span>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Next up</h2>
          <Link href="/resources" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            all resources →
          </Link>
        </div>

        {nextUp.length === 0 ? (
          <div className="rounded-chunky border border-dashed border-border p-8 text-center space-y-3">
            <p className="text-muted-foreground">No active sessions yet.</p>
            <Link href="/resources/new" className={buttonVariants()}>
              Start learning
            </Link>
          </div>
        ) : (
          <motion.div variants={stagger} className="space-y-3">
            {nextUp.map(({ session, resource }) => (
              <motion.div key={session.id} variants={fadeUp}>
                <Link
                  href={`/sessions/${session.id}`}
                  className="card-playful block p-4 hover:bg-accent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground truncate">{resource.title}</p>
                      <p className="font-medium leading-snug">{session.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{session.focusGoal}</p>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <p className="text-xs text-muted-foreground">{session.estimatedMinutes} min</p>
                      <p className="text-xs font-medium text-primary">+{session.xpValue} XP</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}

            <Link
              href={`/sessions/${nextUp[0]!.session.id}`}
              className={buttonVariants({ className: "w-full shadow-chunky-primary" })}
            >
              Continue learning →
            </Link>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
