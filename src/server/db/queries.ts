import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { USER_ID } from "@/lib/constants";

export async function getCurrentUser() {
  const rows = await db.select().from(users).where(eq(users.id, USER_ID));
  return rows[0];
}
