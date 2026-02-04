import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { v4 as uuidv4 } from "uuid";

export const bugReports = pgTable("bug_reports", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  severity: varchar("severity", { length: 50 }).notNull(),
  description: text("description").notNull(),
  stepsToReproduce: text("steps_to_reproduce"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const bugReportAttachments = pgTable("bug_report_attachments", {
  id: serial("id").primaryKey(),
  bugReportId: serial("bug_report_id")
    .notNull()
    .references(() => bugReports.id, { onDelete: "cascade" }),
  upstashId: varchar("upstash_id", { length: 255 })
    .notNull()
    .$defaultFn(() => uuidv4()),
  originalFileName: varchar("original_file_name", { length: 500 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: varchar("file_size", { length: 50 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  uploadedAt: timestamp("uploaded_at", { mode: "date" }).defaultNow().notNull(),
});

export type BugReport = typeof bugReports.$inferSelect;
export type NewBugReport = typeof bugReports.$inferInsert;
export type BugReportAttachment = typeof bugReportAttachments.$inferSelect;
export type NewBugReportAttachment = typeof bugReportAttachments.$inferInsert;
