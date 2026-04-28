import {
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export type SourceLocator =
  | { kind: "youtube"; videoId?: string; startSeconds: number; endSeconds: number }
  | { kind: "pdf"; pages: number[] }
  | { kind: "text"; range: [number, number] };

export const sourceTypeEnum = pgEnum("source_type", [
  "text",
  "youtube_video",
  "youtube_playlist",
  "pdf",
]);

export const skillLevelEnum = pgEnum("skill_level", [
  "beginner",
  "intermediate",
  "advanced",
]);

export const resourceStatusEnum = pgEnum("resource_status", [
  "processing",
  "ready",
  "completed",
  "failed",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: date("last_active_date"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  sourceType: sourceTypeEnum("source_type").notNull(),
  sourceUrlOrPath: text("source_url_or_path"),
  rawContent: text("raw_content"),
  skillLevel: skillLevelEnum("skill_level").notNull(),
  status: resourceStatusEnum("status").notNull().default("processing"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  resourceId: uuid("resource_id")
    .notNull()
    .references(() => resources.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  title: text("title").notNull(),
  focusGoal: text("focus_goal").notNull(),
  learningObjectives: jsonb("learning_objectives")
    .$type<string[]>()
    .notNull(),
  keyConcepts: jsonb("key_concepts").$type<string[]>().notNull(),
  outcomeStatement: text("outcome_statement").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  sourceLocator: jsonb("source_locator").$type<SourceLocator>().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  reflectionNotes: text("reflection_notes"),
  xpValue: integer("xp_value").notNull(),
});

export const xpEvents = pgTable("xp_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").references(() => sessions.id, {
    onDelete: "set null",
  }),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type XpEvent = typeof xpEvents.$inferSelect;
export type NewXpEvent = typeof xpEvents.$inferInsert;
