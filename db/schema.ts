import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey(),
  raw: text("raw").notNull(),
  workflowStatus: text("workflow_status").notNull().default("new"),
  note: text("note").notNull().default(""),
  createdAt: integer("created_at").notNull(),
}, (t) => [index("idx_alerts_created_at").on(t.createdAt)]);
