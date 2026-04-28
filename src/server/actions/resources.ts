"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db/client";
import { resources, sessions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ingestText } from "@/server/ingest/text";
import { ingestYouTube } from "@/server/ingest/youtube";
import { ingestPDF } from "@/server/ingest/pdf";
import { runBreakdown } from "@/server/llm/breakdown";
import { USER_ID } from "@/lib/constants";

export type CreateResourceState = { error: string } | null;

const CreateTextSchema = z.object({
  sourceType: z.literal("text"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(50, "Text must be at least 50 characters"),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]),
});

const CreateYouTubeSchema = z.object({
  sourceType: z.literal("youtube_video"),
  url: z.string().url("Must be a valid URL"),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]),
});

const CreatePDFSchema = z.object({
  sourceType: z.literal("pdf"),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]),
});

export async function createResource(
  _prevState: CreateResourceState,
  formData: FormData
): Promise<CreateResourceState> {
  const sourceType = formData.get("sourceType");

  let resourceId: string | null = null;

  try {
    if (sourceType === "text") {
      const parsed = CreateTextSchema.safeParse({
        sourceType: "text",
        title: formData.get("title"),
        content: formData.get("content"),
        skillLevel: formData.get("skillLevel"),
      });
      if (!parsed.success) {
        return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
      }
      const { title, content, skillLevel } = parsed.data;

      const [inserted] = await db
        .insert(resources)
        .values({
          userId: USER_ID,
          title,
          sourceType: "text",
          skillLevel,
          status: "processing",
        })
        .returning({ id: resources.id });

      resourceId = inserted?.id ?? null;
      if (!resourceId) throw new Error("Failed to create resource record");

      const content_ = ingestText(title, content);
      const newSessions = await runBreakdown(content_, skillLevel, resourceId);

      await db.transaction(async (tx) => {
        await tx
          .update(resources)
          .set({ status: "ready", rawContent: content })
          .where(eq(resources.id, resourceId!));
        await tx.insert(sessions).values(newSessions);
      });
    } else if (sourceType === "youtube_video") {
      const parsed = CreateYouTubeSchema.safeParse({
        sourceType: "youtube_video",
        url: formData.get("url"),
        skillLevel: formData.get("skillLevel"),
      });
      if (!parsed.success) {
        return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
      }
      const { url, skillLevel } = parsed.data;

      const ytContent = await ingestYouTube(url);

      const [inserted] = await db
        .insert(resources)
        .values({
          userId: USER_ID,
          title: ytContent.title,
          sourceType: "youtube_video",
          sourceUrlOrPath: url,
          skillLevel,
          status: "processing",
        })
        .returning({ id: resources.id });

      resourceId = inserted?.id ?? null;
      if (!resourceId) throw new Error("Failed to create resource record");

      const newSessions = await runBreakdown(ytContent, skillLevel, resourceId);

      await db.transaction(async (tx) => {
        await tx
          .update(resources)
          .set({ status: "ready" })
          .where(eq(resources.id, resourceId!));
        await tx.insert(sessions).values(newSessions);
      });
    } else if (sourceType === "pdf") {
      const parsed = CreatePDFSchema.safeParse({
        sourceType: "pdf",
        skillLevel: formData.get("skillLevel"),
      });
      if (!parsed.success) {
        return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
      }
      const { skillLevel } = parsed.data;

      const file = formData.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return { error: "Please select a PDF file." };
      }
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return { error: "Only PDF files are supported." };
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfContent = await ingestPDF(buffer, file.name);

      const [inserted] = await db
        .insert(resources)
        .values({
          userId: USER_ID,
          title: pdfContent.title,
          sourceType: "pdf",
          skillLevel,
          status: "processing",
        })
        .returning({ id: resources.id });

      resourceId = inserted?.id ?? null;
      if (!resourceId) throw new Error("Failed to create resource record");

      const newSessions = await runBreakdown(pdfContent, skillLevel, resourceId);

      await db.transaction(async (tx) => {
        await tx
          .update(resources)
          .set({ status: "ready", rawContent: pdfContent.pageTexts.join("\f") })
          .where(eq(resources.id, resourceId!));
        await tx.insert(sessions).values(newSessions);
      });
    } else {
      return { error: "Unknown source type" };
    }
  } catch (err) {
    if (resourceId) {
      await db
        .update(resources)
        .set({
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        })
        .where(eq(resources.id, resourceId))
        .catch(() => undefined);
    }
    return {
      error: err instanceof Error ? err.message : "Something went wrong. Please try again.",
    };
  }

  redirect(`/resources/${resourceId}`);
}
