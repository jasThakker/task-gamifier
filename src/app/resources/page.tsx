import Link from "next/link";
import { getAllResources } from "@/server/db/queries";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SOURCE_LABELS: Record<string, string> = {
  text: "Text",
  youtube_video: "YouTube",
  youtube_playlist: "Playlist",
  pdf: "PDF",
};

export default async function ResourcesPage() {
  const allResources = await getAllResources();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your resources</h1>
        <Link href="/resources/new" className={buttonVariants()}>
          + New
        </Link>
      </div>

      {allResources.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed py-16 text-center">
          <p className="text-muted-foreground">No resources yet.</p>
          <Link
            href="/resources/new"
            className={buttonVariants({ className: "mt-4" })}
          >
            Add your first resource
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {allResources.map((r) => {
            const pct =
              r.sessionCount > 0
                ? Math.round((r.completedCount / r.sessionCount) * 100)
                : 0;
            return (
              <Link key={r.id} href={`/resources/${r.id}`}>
                <Card className="transition-colors hover:border-primary/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base">{r.title}</CardTitle>
                      <div className="flex shrink-0 gap-2">
                        <Badge variant="outline">
                          {SOURCE_LABELS[r.sourceType] ?? r.sourceType}
                        </Badge>
                        {r.status === "failed" && (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {r.completedCount}/{r.sessionCount} sessions
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
