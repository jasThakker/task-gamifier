import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/db/queries";
import { markSessionComplete } from "@/server/actions/sessions";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { TextExcerpt } from "@/components/text-excerpt";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SourceLocator } from "@/server/db/schema";

type Props = { params: Promise<{ id: string }> };

export default async function SessionPage({ params }: Props) {
  const { id } = await params;
  const data = await getSession(id);
  if (!data) notFound();

  const { session, resource } = data;
  const locator = session.sourceLocator as SourceLocator;
  const isComplete = !!session.completedAt;

  return (
    <div className="space-y-8">
      <Link
        href={`/resources/${resource.id}`}
        className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}
      >
        ← {resource.title}
      </Link>

      {/* Content embed */}
      {locator.kind === "youtube" && (
        <YouTubeEmbed
          videoId={locator.videoId ?? ""}
          startSeconds={locator.startSeconds}
          endSeconds={locator.endSeconds}
        />
      )}

      {locator.kind === "text" && resource.rawContent && (
        <TextExcerpt fullText={resource.rawContent} range={locator.range} />
      )}

      {/* Session flashcard */}
      <div className="space-y-6 rounded-xl border p-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold leading-tight">{session.title}</h1>
          <div className="flex shrink-0 gap-2">
            <Badge variant="outline">~{session.estimatedMinutes} min</Badge>
            {isComplete && <Badge variant="secondary">Done</Badge>}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Focus
          </p>
          <p className="text-sm leading-relaxed">{session.focusGoal}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Learning objectives
          </p>
          <ul className="space-y-1">
            {session.learningObjectives.map((obj, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-0.5 shrink-0 text-muted-foreground">–</span>
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>

        {session.keyConcepts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Key concepts
            </p>
            <div className="flex flex-wrap gap-2">
              {session.keyConcepts.map((concept, i) => (
                <Badge key={i} variant="outline">
                  {concept}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1 rounded-md bg-muted/50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Outcome
          </p>
          <p className="text-sm leading-relaxed">{session.outcomeStatement}</p>
        </div>
      </div>

      {/* Mark complete form */}
      {!isComplete ? (
        <form action={markSessionComplete} className="space-y-4">
          <input type="hidden" name="sessionId" value={session.id} />
          <div className="space-y-2">
            <label htmlFor="reflection" className="text-sm font-medium">
              Reflection{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="reflection"
              name="reflection"
              placeholder="What clicked? What's still fuzzy? Any questions?"
              rows={3}
            />
          </div>
          <button type="submit" className={buttonVariants({ className: "w-full" })}>
            Mark complete
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          {session.reflectionNotes && (
            <div className="rounded-md border bg-muted/30 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your reflection
              </p>
              <p className="text-sm leading-relaxed">{session.reflectionNotes}</p>
            </div>
          )}
          <Link
            href={`/resources/${resource.id}`}
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            Back to resource
          </Link>
        </div>
      )}
    </div>
  );
}
