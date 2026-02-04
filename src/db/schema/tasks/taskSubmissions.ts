import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tasks } from "./tasks";
import { employees } from "../hr";
import { taskReviews } from "./tasksReviews";

export const taskSubmissions = pgTable(
  "task_submissions",
  {
    id: serial("id").primaryKey(),

    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),

    submittedBy: integer("submitted_by")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    submissionNote: text("submission_note"),
    submittedFiles:
      jsonb("submitted_files").$type<{ fileUrl: string; fileName: string }[]>(),
    submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  },
  (table) => [
    index("task_submissions_task_idx").on(table.taskId),
    index("task_submissions_employee_idx").on(table.submittedBy),
  ],
);

export const taskSubmissionsRelations = relations(
  taskSubmissions,
  ({ one, many }) => ({
    task: one(tasks, {
      fields: [taskSubmissions.taskId],
      references: [tasks.id],
    }),
    submittedBy: one(employees, {
      fields: [taskSubmissions.submittedBy],
      references: [employees.id],
    }),
    reviews: many(taskReviews),
  }),
);
