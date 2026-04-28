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

const PdfSessionSchema = z.object({
  title: z.string().min(1),
  focusGoal: z.string().min(1),
  learningObjectives: z.array(z.string()).min(1).max(8),
  keyConcepts: z.array(z.string()).min(1).max(12),
  outcomeStatement: z.string().min(1),
  estimatedMinutes: z.number().min(1).max(240).transform(Math.round),
  // LLMs sometimes return floats; round to nearest int and clamp to page 1+
  pages: z.array(z.number().min(0).transform((n) => Math.max(1, Math.round(n)))).min(1),
});

const TextResponseSchema = z.object({
  sessions: z.array(TextSessionSchema).min(1).max(40),
});

const PdfResponseSchema = z.object({
  sessions: z.array(PdfSessionSchema).min(1).max(15),
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

  if (content.kind === "pdf") {
    let result;
    try {
      result = await generateObject({
        model,
        schema: PdfResponseSchema,
        system,
        prompt: user,
        maxTokens: 8192,
      });
    } catch (err) {
      console.error("[PDF breakdown] generateObject failed:", err);
      throw err;
    }
    const { object } = result;

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
      sourceLocator: { kind: "pdf" as const, pages: s.pages },
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
