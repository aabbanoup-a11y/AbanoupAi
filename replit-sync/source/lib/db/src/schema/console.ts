import { createInsertSchema } from "drizzle-zod";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const consoleActivityTable = pgTable("console_activity", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  detail: text("detail"),
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  steps: jsonb("steps").$type<ActivityStep[]>().notNull().default([]),
});

export const connectionActionsTable = pgTable("connection_actions", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  action: text("action").notNull(),
  target: text("target").notNull(),
  description: text("description").notNull(),
  payload: text("payload"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const browserTasksTable = pgTable("browser_tasks", {
  id: text("id").primaryKey(),
  command: text("command").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  result: text("result"),
  steps: jsonb("steps").$type<ActivityStep[]>().notNull().default([]),
});

export type ActivityStep = {
  label: string;
  status: string;
  at: string;
  detail?: string | null;
};

export const insertConsoleActivitySchema = createInsertSchema(consoleActivityTable);
export const insertConnectionActionSchema = createInsertSchema(connectionActionsTable);
export const insertBrowserTaskSchema = createInsertSchema(browserTasksTable);

export type ConsoleActivity = typeof consoleActivityTable.$inferSelect;
export type ConnectionAction = typeof connectionActionsTable.$inferSelect;
export type BrowserTask = typeof browserTasksTable.$inferSelect;
export type InsertConsoleActivity = z.infer<typeof insertConsoleActivitySchema>;
export type InsertConnectionAction = z.infer<typeof insertConnectionActionSchema>;
export type InsertBrowserTask = z.infer<typeof insertBrowserTaskSchema>;