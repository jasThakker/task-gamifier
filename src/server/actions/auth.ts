"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";

export type AuthState = { error: string } | null;

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const username = formData.get("username")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();
  const confirm = formData.get("confirm")?.toString();

  if (!username || username.length < 3) return { error: "Username must be at least 3 characters" };
  if (!/^[a-z0-9_]+$/.test(username)) return { error: "Username can only contain letters, numbers, and underscores" };
  if (!password || password.length < 6) return { error: "Password must be at least 6 characters" };
  if (password !== confirm) return { error: "Passwords do not match" };

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (existing.length > 0) return { error: "Username already taken" };

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({ name: username, username, passwordHash })
    .returning({ id: users.id });

  if (!user) return { error: "Failed to create account" };

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  redirect("/");
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const username = formData.get("username")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!username || !password) return { error: "Username and password are required" };

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user?.passwordHash) return { error: "Invalid username or password" };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { error: "Invalid username or password" };

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  redirect("/");
}

export async function signOut(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
