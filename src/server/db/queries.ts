import { eq, and, asc } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users, resources, sessions } from "@/server/db/schema";

export async function getCurrentUser(userId: string) {
  const rows = await db.select().from(users).where(eq(users.id, userId));
  return rows[0] ?? null;
}

export async function getAllResources(userId: string) {
  const allResources = await db
    .select()
    .from(resources)
    .where(eq(resources.userId, userId))
    .orderBy(resources.createdAt);

  const allSessions = await db
    .select({ resourceId: sessions.resourceId, completedAt: sessions.completedAt })
    .from(sessions)
    .innerJoin(resources, eq(sessions.resourceId, resources.id))
    .where(eq(resources.userId, userId));

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

export async function getResourceWithSessions(resourceId: string, userId: string) {
  const resource = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, resourceId), eq(resources.userId, userId)))
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

export async function getDashboardData(userId: string) {
  const user = await getCurrentUser(userId);
  if (!user) return null;

  const activeResources = await db
    .select()
    .from(resources)
    .where(and(eq(resources.userId, userId), eq(resources.status, "ready")))
    .orderBy(resources.createdAt);

  if (activeResources.length === 0) return { user, nextUp: [], hasResources: false };

  const allSessions = await db
    .select()
    .from(sessions)
    .innerJoin(resources, eq(sessions.resourceId, resources.id))
    .where(and(eq(resources.userId, userId), eq(resources.status, "ready")))
    .orderBy(asc(sessions.orderIndex));

  const hasResources = await db
    .select({ id: resources.id })
    .from(resources)
    .where(eq(resources.userId, userId))
    .limit(1)
    .then((rows) => rows.length > 0);

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

  return { user, nextUp, hasResources };
}

export async function getSession(sessionId: string, userId: string) {
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
    .where(and(eq(resources.id, session.resourceId), eq(resources.userId, userId)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!resource) return null;

  return { session, resource };
}
