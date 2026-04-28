import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/db/queries";
import { markSessionComplete, unmarkSessionComplete } from "@/server/actions/sessions";
import { requireUserId } from "@/lib/auth";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { TextExcerpt } from "@/components/text-excerpt";
import { PdfExcerpt } from "@/components/pdf-excerpt";
import { SessionFlashcard } from "@/components/session-flashcard";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SourceLocator } from "@/server/db/schema";

type Props = { params: Promise<{ id: string }> };

export default async function SessionPage({ params }: Props) {
  const { id } = await params;
  const userId = await requireUserId();
  const data = await getSession(id, userId);
  if (!data) notFound();

  const { session, resource } = data;
  const locator = session.sourceLocator as SourceLocator;
  const isComplete = !!session.completedAt;

  return (
    <div className="space-y-6">
      <Link
        href={`/resources/${resource.id}`}
        className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}
      >
        ← {resource.title}
      </Link>

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

      {locator.kind === "pdf" && resource.rawContent && (
        <PdfExcerpt rawContent={resource.rawContent} pages={locator.pages} />
      )}

      <SessionFlashcard session={session} />

      {!isComplete ? (
        <form action={markSessionComplete} className="space-y-4">
          <input type="hidden" name="sessionId" value={session.id} />
          <div className="space-y-2">
            <label htmlFor="reflection" className="text-sm font-bold">
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
            Mark complete ✓
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          {session.reflectionNotes && (
            <div className="card-playful p-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
          <form action={unmarkSessionComplete}>
            <input type="hidden" name="sessionId" value={session.id} />
            <button
              type="submit"
              className={buttonVariants({ variant: "ghost", className: "w-full text-muted-foreground text-sm" })}
            >
              Undo completion
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
