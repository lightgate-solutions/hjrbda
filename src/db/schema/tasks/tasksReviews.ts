import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tasks } from "./tasks";
import { taskSubmissions } from "./taskSubmissions";
import { employees } from "../hr";
import { reviewStatusEnum } from "./enums";

export const taskReviews = pgTable(
  "task_reviews",
  {
    id: serial("id").primaryKey(),

    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),

    submissionId: integer("submission_id")
      .notNull()
      .references(() => taskSubmissions.id, { onDelete: "cascade" }),

    reviewedBy: integer("reviewed_by")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    status: reviewStatusEnum("status").notNull(),

    reviewNote: text("review_note"),

    reviewedAt: timestamp("reviewed_at").notNull().defaultNow(),
  },
  (table) => [
    index("task_reviews_task_idx").on(table.taskId),
    index("task_reviews_submission_idx").on(table.submissionId),
    index("task_reviews_reviewer_idx").on(table.reviewedBy),
  ],
);

export const taskReviewsRelations = relations(taskReviews, ({ one }) => ({
  task: one(tasks, {
    fields: [taskReviews.taskId],
    references: [tasks.id],
  }),
  submission: one(taskSubmissions, {
    fields: [taskReviews.submissionId],
    references: [taskSubmissions.id],
  }),
  reviewedBy: one(employees, {
    fields: [taskReviews.reviewedBy],
    references: [employees.id],
  }),
}));
