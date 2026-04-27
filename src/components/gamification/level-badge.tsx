interface LevelBadgeProps {
  level: number;
  className?: string;
}

export function LevelBadge({ level, className }: LevelBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary ${className ?? ""}`}
    >
      ⭐ Lv.{level}
    </span>
  );
}
