export const XP_PER_MINUTE = 10;

export function xpForSession(estimatedMinutes: number): number {
  return Math.max(estimatedMinutes * XP_PER_MINUTE, XP_PER_MINUTE);
}

export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)));
}

export function xpThresholdForLevel(level: number): number {
  return level * level * 100;
}

export function progressToNextLevel(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
} {
  const level = levelFromXp(xp);
  const currentFloor = xpThresholdForLevel(level);
  const nextFloor = xpThresholdForLevel(level + 1);
  const xpIntoLevel = xp - currentFloor;
  const xpNeededForNext = nextFloor - currentFloor;
  const progressPercent = Math.min(
    Math.round((xpIntoLevel / xpNeededForNext) * 100),
    100
  );
  return { level, xpIntoLevel, xpNeededForNext, progressPercent };
}
