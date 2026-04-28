"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { resources, sessions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { USER_ID } from "@/lib/constants";

const SAMPLE_TEXT = `The Science of Effective Learning

Decades of cognitive science research have uncovered a counterintuitive truth: the study habits most students rely on — rereading notes, highlighting, and marathon sessions — are among the least effective ways to learn.

Active Recall
The most powerful learning technique is retrieval practice: testing yourself on material rather than simply reviewing it. Every time you retrieve a memory, you strengthen the neural pathways associated with it. This is called the testing effect, and it works even when you get the answer wrong — the struggle itself is the learning.

Spaced Repetition
Your brain consolidates memories during rest. Reviewing material in spaced intervals — rather than cramming — takes advantage of this. The optimal schedule follows the forgetting curve: review just as you are about to forget. Reviewing after one day, then three days, then a week outperforms three hours of study in a single sitting.

Interleaving and Elaboration
Interleaving — mixing different topics or problem types in one session — feels harder but produces better long-term retention than blocked practice. Elaborative interrogation — asking yourself why and how questions — connects new information to what you already know, creating richer and more durable memory traces.`;

export async function seedSampleResource() {
  const existing = await db
    .select({ id: resources.id })
    .from(resources)
    .where(eq(resources.userId, USER_ID))
    .limit(1);

  if (existing.length > 0) {
    redirect("/resources");
  }

  const [resource] = await db
    .insert(resources)
    .values({
      userId: USER_ID,
      title: "The Science of Effective Learning",
      sourceType: "text",
      skillLevel: "beginner",
      status: "ready",
      rawContent: SAMPLE_TEXT,
    })
    .returning({ id: resources.id });

  if (!resource) throw new Error("Failed to seed sample resource");

  const total = SAMPLE_TEXT.length;
  const third = Math.floor(total / 3);

  await db.insert(sessions).values([
    {
      resourceId: resource.id,
      orderIndex: 0,
      title: "Active Recall: Test Yourself to Learn",
      focusGoal: "Understand why retrieving information beats rereading it, and how to apply retrieval practice to any subject.",
      learningObjectives: [
        "Explain the testing effect in plain language",
        "Describe why struggle during recall strengthens memory",
        "Identify at least two ways to apply active recall while studying",
      ],
      keyConcepts: ["testing effect", "retrieval practice", "desirable difficulty", "neural pathways"],
      outcomeStatement: "After this session you will be able to replace passive review with active recall techniques.",
      estimatedMinutes: 15,
      xpValue: 150,
      sourceLocator: { kind: "text", range: [0, third] },
      completedAt: null,
      reflectionNotes: null,
    },
    {
      resourceId: resource.id,
      orderIndex: 1,
      title: "Spaced Repetition: Study Less, Remember More",
      focusGoal: "Learn how distributing practice over time exploits the forgetting curve to lock in long-term retention.",
      learningObjectives: [
        "Describe the forgetting curve and what it predicts",
        "Explain why spaced practice beats massed (cramming) practice",
        "Sketch a simple spaced review schedule for a new topic",
      ],
      keyConcepts: ["forgetting curve", "spaced practice", "massed practice", "review intervals", "consolidation"],
      outcomeStatement: "After this session you will be able to design a review schedule that maximises long-term retention.",
      estimatedMinutes: 20,
      xpValue: 200,
      sourceLocator: { kind: "text", range: [third, third * 2] },
      completedAt: null,
      reflectionNotes: null,
    },
    {
      resourceId: resource.id,
      orderIndex: 2,
      title: "Interleaving and Elaboration: Go Deeper",
      focusGoal: "Explore two underrated techniques — mixing topics and asking why — that build richer understanding.",
      learningObjectives: [
        "Define interleaving and explain its counterintuitive benefit over blocked practice",
        "Use elaborative interrogation to connect new ideas to existing knowledge",
        "Plan a study session that incorporates both techniques",
      ],
      keyConcepts: ["interleaving", "blocked practice", "elaborative interrogation", "schema", "contextual interference"],
      outcomeStatement: "After this session you will be able to structure study sessions that go beyond surface memorisation.",
      estimatedMinutes: 20,
      xpValue: 200,
      sourceLocator: { kind: "text", range: [third * 2, total] },
      completedAt: null,
      reflectionNotes: null,
    },
  ]);

  redirect(`/resources/${resource.id}`);
}
