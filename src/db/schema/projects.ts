import { relations } from "drizzle-orm";
import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { employees } from "./hr";
import { projectPhotos } from "./project-photos";

// Define enum ONCE at module scope so Drizzle emits CREATE TYPE before using it
export const projectStatusEnum = pgEnum("project_status", [
  "pending",
  "in-progress",
  "completed",
]);

export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    description: text("description"),
    street: text("street").notNull().default(""),
    city: text("city").notNull().default(""),
    state: text("state").notNull().default(""),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    status: projectStatusEnum("status").default("pending").notNull(),
    budgetPlanned: integer("budget_planned").default(0).notNull(),
    budgetActual: integer("budget_actual").default(0).notNull(),
    supervisorId: integer("supervisor_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    contractorId: integer("contractor_id").references(() => contractors.id, {
      onDelete: "set null",
    }),
    creatorId: integer("creator_id")
      .notNull()
      .references(() => employees.id, {
        onDelete: "cascade",
      }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("projects_supervisor_idx").on(table.supervisorId),
    index("projects_contractor_idx").on(table.contractorId),
    index("projects_creator_idx").on(table.creatorId),
  ],
);

export const contractors = pgTable("contractors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  specialization: text("specialization"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projectMembers = pgTable(
  "project_members",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("project_members_project_idx").on(table.projectId),
    index("project_members_employee_idx").on(table.employeeId),
  ],
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  supervisor: one(employees, {
    fields: [projects.supervisorId],
    references: [employees.id],
    relationName: "projectSupervisor",
  }),
  contractor: one(contractors, {
    fields: [projects.contractorId],
    references: [contractors.id],
  }),
  creator: one(employees, {
    fields: [projects.creatorId],
    references: [employees.id],
    relationName: "projectCreator",
  }),
  members: many(projectMembers),
  milestones: many(milestones),
  expenses: many(expenses),
  photos: many(projectPhotos),
}));

export const contractorsRelations = relations(contractors, ({ many }) => ({
  projects: many(projects),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  employee: one(employees, {
    fields: [projectMembers.employeeId],
    references: [employees.id],
  }),
}));

export const milestones = pgTable(
  "milestones",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: timestamp("due_date"),
    completed: integer("completed").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("milestones_project_idx").on(table.projectId)],
);

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
  photos: many(projectPhotos),
}));

export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    amount: integer("amount").notNull().default(0),
    spentAt: timestamp("spent_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("expenses_project_idx").on(table.projectId)],
);

export const expensesRelations = relations(expenses, ({ one }) => ({
  project: one(projects, {
    fields: [expenses.projectId],
    references: [projects.id],
  }),
}));
