import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  index,
  date,
  integer,
  serial,
  jsonb,
} from "drizzle-orm/pg-core";
import { taskStatusEnum, taskPriorityEnum } from "./enums";
import { employees } from "../hr";

import { projects, milestones } from "../projects";

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),

    assignedTo: integer("assigned_to")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    assignedBy: integer("assigned_by")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    projectId: integer("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    milestoneId: integer("milestone_id").references(() => milestones.id, {
      onDelete: "set null",
    }),

    status: taskStatusEnum("status").notNull().default("Todo"),
    priority: taskPriorityEnum("priority").notNull().default("Medium"),
    dueDate: date("due_date"),

    // Board-specific fields
    attachments: jsonb("attachments").$type<{ url: string; name: string }[]>(),
    links: jsonb("links").$type<{ url: string; title: string }[]>(),
    progressCompleted: integer("progress_completed").default(0),
    progressTotal: integer("progress_total").default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("tasks_assigned_to_idx").on(table.assignedTo),
    index("tasks_assigned_by_idx").on(table.assignedBy),
    index("tasks_status_idx").on(table.status),
  ],
);

export const taskRelations = relations(tasks, ({ one }) => ({
  assignedTo: one(employees, {
    fields: [tasks.assignedTo],
    references: [employees.id],
    relationName: "assignedTo",
  }),
  assignedBy: one(employees, {
    fields: [tasks.assignedBy],
    references: [employees.id],
    relationName: "assignedBy",
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  milestone: one(milestones, {
    fields: [tasks.milestoneId],
    references: [milestones.id],
  }),
}));
