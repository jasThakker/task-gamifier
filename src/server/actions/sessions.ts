"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { sessions, users, xpEvents } from "@/server/db/schema";
import { getSession, getCurrentUser } from "@/server/db/queries";
import { xpForSession, levelFromXp } from "@/lib/xp";
import { computeStreakUpdate } from "@/lib/streak";

export async function markSessionComplete(formData: FormData): Promise<void> {
  const sessionId = formData.get("sessionId");
  if (typeof sessionId !== "string") throw new Error("Missing sessionId");

  const [row, user] = await Promise.all([getSession(sessionId), getCurrentUser()]);
  if (!row) throw new Error("Session not found");
  if (!user) throw new Error("User not found");

  let celebrationParams = "";

  if (!row.session.completedAt) {
    const reflection = formData.get("reflection");
    const xpDelta = xpForSession(row.session.estimatedMinutes);

    const newXp = user.xp + xpDelta;
    const newLevel = levelFromXp(newXp);
    const oldLevel = levelFromXp(user.xp);
    const leveledUp = newLevel > oldLevel;
    const streakUpdate = computeStreakUpdate(
      user.currentStreak,
      user.longestStreak,
      user.lastActiveDate
    );

    await db.transaction(async (tx) => {
      await tx
        .update(sessions)
        .set({
          completedAt: new Date(),
          reflectionNotes:
            typeof reflection === "string" && reflection.trim()
              ? reflection.trim()
              : null,
        })
        .where(eq(sessions.id, sessionId));

      await tx.insert(xpEvents).values({
        userId: user.id,
        sessionId,
        delta: xpDelta,
        reason: `Completed session: ${row.session.title}`,
      });

      await tx
        .update(users)
        .set({
          xp: newXp,
          level: newLevel,
          currentStreak: streakUpdate.currentStreak,
          longestStreak: streakUpdate.longestStreak,
          lastActiveDate: streakUpdate.lastActiveDate,
        })
        .where(eq(users.id, user.id));
    });

    celebrationParams = `?xp=${xpDelta}&leveled=${leveledUp ? newLevel : 0}`;
  }

  redirect(`/resources/${row.resource.id}${celebrationParams}`);
}
