import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { users } from "@/server/db/schema";
import { USER_ID } from "@/lib/constants";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  const existing = await db.select().from(users).where(eq(users.id, USER_ID));
  if (existing.length === 0) {
    const passwordHash = await bcrypt.hash("password", 12);
    await db.insert(users).values({
      id: USER_ID,
      name: "admin",
      username: "admin",
      passwordHash,
    });
    console.log("seeded user", USER_ID, "— username: admin / password: password");
  } else {
    console.log("user already exists", USER_ID);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
