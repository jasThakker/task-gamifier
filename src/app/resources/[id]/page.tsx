import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { getResourceWithSessions } from "@/server/db/queries";
import { SessionCard } from "@/components/session-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CelebrationTrigger } from "@/components/gamification/celebration-trigger";

const SOURCE_LABELS: Record<string, string> = {
  text: "Text",
  youtube_video: "YouTube",
  youtube_playlist: "Playlist",
  pdf: "PDF",
};

type Props = { params: Promise<{ id: string }> };

export default async function ResourcePage({ params }: Props) {
  const { id } = await params;
  const data = await getResourceWithSessions(id);
  if (!data) notFound();

  const { resource, sessions } = data;
  const completed = sessions.filter((s) => s.completedAt).length;
  const pct =
    sessions.length > 0 ? Math.round((completed / sessions.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <Suspense>
        <CelebrationTrigger />
      </Suspense>
      <Link
        href="/resources"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}
      >
        ← Resources
      </Link>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold leading-tight">{resource.title}</h1>
          <Badge variant="outline" className="shrink-0">
            {SOURCE_LABELS[resource.sourceType] ?? resource.sourceType}
          </Badge>
        </div>

        {resource.status === "failed" && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {resource.errorMessage ?? "Something went wrong generating sessions."}
          </div>
        )}

        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {completed} of {sessions.length} sessions complete
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="text-muted-foreground">No sessions yet.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, i) => (
            <SessionCard key={session.id} session={session} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
