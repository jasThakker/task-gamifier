import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Session } from "@/server/db/schema";

type Props = {
  session: Session;
  index: number;
};

export function SessionCard({ session, index }: Props) {
  const isComplete = !!session.completedAt;

  return (
    <Link href={`/sessions/${session.id}`}>
      <Card
        className={`transition-colors hover:border-primary/50 ${
          isComplete ? "opacity-60" : ""
        }`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                {isComplete ? "✓" : index + 1}
              </span>
              <CardTitle className="text-base leading-snug">{session.title}</CardTitle>
            </div>
            {isComplete && (
              <Badge variant="secondary" className="shrink-0">
                Done
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{session.focusGoal}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            ~{session.estimatedMinutes} min
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
