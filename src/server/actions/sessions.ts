"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { sessions } from "@/server/db/schema";
import { getSession } from "@/server/db/queries";

export async function markSessionComplete(formData: FormData): Promise<void> {
  const sessionId = formData.get("sessionId");
  if (typeof sessionId !== "string") throw new Error("Missing sessionId");

  const row = await getSession(sessionId);
  if (!row) throw new Error("Session not found");

  if (!row.session.completedAt) {
    const reflection = formData.get("reflection");
    await db
      .update(sessions)
      .set({
        completedAt: new Date(),
        reflectionNotes:
          typeof reflection === "string" && reflection.trim()
            ? reflection.trim()
            : null,
      })
      .where(eq(sessions.id, sessionId));
  }

  redirect(`/resources/${row.resource.id}`);
}
