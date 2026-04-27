import { eq, and, asc } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users, resources, sessions } from "@/server/db/schema";
import { USER_ID } from "@/lib/constants";

export async function getCurrentUser() {
  const rows = await db.select().from(users).where(eq(users.id, USER_ID));
  return rows[0] ?? null;
}

export async function getAllResources() {
  const allResources = await db
    .select()
    .from(resources)
    .where(eq(resources.userId, USER_ID))
    .orderBy(resources.createdAt);

  const allSessions = await db
    .select({ resourceId: sessions.resourceId, completedAt: sessions.completedAt })
    .from(sessions)
    .innerJoin(resources, eq(sessions.resourceId, resources.id))
    .where(eq(resources.userId, USER_ID));

  const countsByResource = allSessions.reduce<
    Record<string, { total: number; completed: number }>
  >((acc, s) => {
    const key = s.resourceId;
    if (!acc[key]) acc[key] = { total: 0, completed: 0 };
    acc[key]!.total++;
    if (s.completedAt) acc[key]!.completed++;
    return acc;
  }, {});

  return allResources.map((r) => ({
    ...r,
    sessionCount: countsByResource[r.id]?.total ?? 0,
    completedCount: countsByResource[r.id]?.completed ?? 0,
  }));
}

export async function getResourceWithSessions(resourceId: string) {
  const resource = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, resourceId), eq(resources.userId, USER_ID)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!resource) return null;

  const sessionList = await db
    .select()
    .from(sessions)
    .where(eq(sessions.resourceId, resourceId))
    .orderBy(asc(sessions.orderIndex));

  return { resource, sessions: sessionList };
}

export async function getDashboardData() {
  const user = await getCurrentUser();
  if (!user) return null;

  const activeResources = await db
    .select()
    .from(resources)
    .where(and(eq(resources.userId, USER_ID), eq(resources.status, "ready")))
    .orderBy(resources.createdAt);

  if (activeResources.length === 0) return { user, nextUp: [] };

  const allSessions = await db
    .select()
    .from(sessions)
    .innerJoin(resources, eq(sessions.resourceId, resources.id))
    .where(and(eq(resources.userId, USER_ID), eq(resources.status, "ready")))
    .orderBy(asc(sessions.orderIndex));

  const nextUp: Array<{
    session: typeof allSessions[number]["sessions"];
    resource: typeof allSessions[number]["resources"];
  }> = [];

  const seenResource = new Set<string>();
  for (const row of allSessions) {
    if (row.sessions.completedAt) continue;
    if (seenResource.has(row.resources.id)) continue;
    seenResource.add(row.resources.id);
    nextUp.push({ session: row.sessions, resource: row.resources });
  }

  return { user, nextUp };
}

export async function getSession(sessionId: string) {
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!session) return null;

  const resource = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, session.resourceId), eq(resources.userId, USER_ID)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!resource) return null;

  return { session, resource };
}
