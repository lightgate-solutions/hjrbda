import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  serial,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { tasks } from "./tasks";

export const taskLabels = pgTable("task_labels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const taskLabelAssignments = pgTable(
  "task_label_assignments",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    labelId: integer("label_id")
      .notNull()
      .references(() => taskLabels.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("task_label_assignments_task_idx").on(table.taskId),
    index("task_label_assignments_label_idx").on(table.labelId),
  ],
);

export const taskLabelsRelations = relations(taskLabels, ({ many }) => ({
  assignments: many(taskLabelAssignments),
}));

export const taskLabelAssignmentsRelations = relations(
  taskLabelAssignments,
  ({ one }) => ({
    task: one(tasks, {
      fields: [taskLabelAssignments.taskId],
      references: [tasks.id],
    }),
    label: one(taskLabels, {
      fields: [taskLabelAssignments.labelId],
      references: [taskLabels.id],
    }),
  }),
);
