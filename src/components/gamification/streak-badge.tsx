interface StreakBadgeProps {
  streak: number;
  className?: string;
}

export function StreakBadge({ streak, className }: StreakBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${className ?? ""}`}>
      🔥 {streak}
    </span>
  );
}
