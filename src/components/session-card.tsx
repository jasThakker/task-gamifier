import Link from "next/link";
import type { Session } from "@/server/db/schema";

type Props = { session: Session; index: number };

export function SessionCard({ session, index }: Props) {
  const isComplete = !!session.completedAt;

  return (
    <Link href={`/sessions/${session.id}`}>
      <div className={`card-playful p-4 hover:bg-accent ${isComplete ? "opacity-60" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-border text-sm font-bold ${isComplete ? "bg-primary text-primary-foreground border-primary" : "bg-muted"}`}>
              {isComplete ? "✓" : index + 1}
            </span>
            <div className="min-w-0">
              <p className="font-bold leading-snug truncate">{session.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{session.focusGoal}</p>
            </div>
          </div>
          <div className="shrink-0 text-right space-y-1">
            <p className="text-xs text-muted-foreground">~{session.estimatedMinutes} min</p>
            {isComplete
              ? <p className="text-xs font-semibold text-primary">Done ✓</p>
              : <p className="text-xs font-semibold text-primary">+{session.xpValue} XP</p>
            }
          </div>
        </div>
      </div>
    </Link>
  );
}
