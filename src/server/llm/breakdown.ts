import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/server/llm/provider";
import { buildPrompt } from "@/server/llm/prompts";
import type { NormalizedContent } from "@/server/ingest/types";
import type { NewSession } from "@/server/db/schema";

const YouTubeSessionSchema = z.object({
  title: z.string().min(1),
  focusGoal: z.string().min(1),
  learningObjectives: z.array(z.string()).min(3).max(5),
  keyConcepts: z.array(z.string()).min(1).max(8),
  outcomeStatement: z.string().min(1),
  estimatedMinutes: z.number().int().min(1).max(180),
  startSeconds: z.number().int().min(0),
  endSeconds: z.number().int().min(0),
});

const TextSessionSchema = z.object({
  title: z.string().min(1),
  focusGoal: z.string().min(1),
  learningObjectives: z.array(z.string()).min(3).max(5),
  keyConcepts: z.array(z.string()).min(1).max(8),
  outcomeStatement: z.string().min(1),
  estimatedMinutes: z.number().int().min(1).max(180),
});

const YouTubeResponseSchema = z.object({
  sessions: z.array(YouTubeSessionSchema).min(1).max(40),
});

const TextResponseSchema = z.object({
  sessions: z.array(TextSessionSchema).min(1).max(40),
});

type SkillLevel = "beginner" | "intermediate" | "advanced";

export async function runBreakdown(
  content: NormalizedContent,
  skillLevel: SkillLevel,
  resourceId: string
): Promise<Omit<NewSession, "id">[]> {
  const { system, user } = buildPrompt(content, skillLevel);
  const model = getModel();

  if (content.kind === "youtube") {
    const { object } = await generateObject({
      model,
      schema: YouTubeResponseSchema,
      system,
      prompt: user,
    });

    return object.sessions.map((s, i) => ({
      resourceId,
      orderIndex: i,
      title: s.title,
      focusGoal: s.focusGoal,
      learningObjectives: s.learningObjectives,
      keyConcepts: s.keyConcepts,
      outcomeStatement: s.outcomeStatement,
      estimatedMinutes: s.estimatedMinutes,
      xpValue: Math.ceil(s.estimatedMinutes * 10),
      sourceLocator: {
        kind: "youtube" as const,
        videoId: content.videoId,
        startSeconds: s.startSeconds,
        endSeconds: s.endSeconds,
      },
      completedAt: null,
      reflectionNotes: null,
    }));
  }

  const textLength = content.text.length;
  const { object } = await generateObject({
    model,
    schema: TextResponseSchema,
    system,
    prompt: user,
  });

  return object.sessions.map((s, i) => {
    const total = object.sessions.length;
    const start = Math.floor((i / total) * textLength);
    const end = Math.floor(((i + 1) / total) * textLength);
    return {
      resourceId,
      orderIndex: i,
      title: s.title,
      focusGoal: s.focusGoal,
      learningObjectives: s.learningObjectives,
      keyConcepts: s.keyConcepts,
      outcomeStatement: s.outcomeStatement,
      estimatedMinutes: s.estimatedMinutes,
      xpValue: Math.ceil(s.estimatedMinutes * 10),
      sourceLocator: { kind: "text" as const, range: [start, end] as [number, number] },
      completedAt: null,
      reflectionNotes: null,
    };
  });
}
