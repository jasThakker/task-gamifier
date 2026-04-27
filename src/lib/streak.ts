function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / msPerDay
  );
}

export function computeStreakUpdate(
  currentStreak: number,
  longestStreak: number,
  lastActiveDate: string | null,
  today = toDateString(new Date())
): { currentStreak: number; longestStreak: number; lastActiveDate: string } {
  if (lastActiveDate === today) {
    return { currentStreak, longestStreak, lastActiveDate: today };
  }

  const gap = lastActiveDate ? daysBetween(lastActiveDate, today) : null;
  const newStreak = gap === 1 ? currentStreak + 1 : 1;
  const newLongest = Math.max(longestStreak, newStreak);

  return { currentStreak: newStreak, longestStreak: newLongest, lastActiveDate: today };
}
