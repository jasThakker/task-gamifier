"use client";

interface XpBarProps {
  xpIntoLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
}

export function XpBar({ xpIntoLevel, xpNeededForNext, progressPercent }: XpBarProps) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{xpIntoLevel} XP</span>
        <span>{xpNeededForNext} XP</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
