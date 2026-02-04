import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  index,
  integer,
  serial,
  boolean,
} from "drizzle-orm/pg-core";
import { employees } from "./hr";

// Enums for Ask HR module
export const askHrStatusEnum = pgEnum("ask_hr_status", [
  "Open", // New question
  "In Progress", // HR is working on it
  "Redirected", // Redirected to another department/user
  "Answered", // Question has been answered
  "Closed", // Question has been resolved and closed
]);

export const askHrCategoryEnum = pgEnum("ask_hr_category", [
  "General",
  "Benefits",
  "Payroll",
  "Leave",
  "Employment",
  "Workplace",
  "Training",
  "Other",
]);

// Questions table
export const askHrQuestions = pgTable(
  "ask_hr_questions",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    question: text("question").notNull(),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    isPublic: boolean("is_public").notNull().default(false),
    allowPublicResponses: boolean("allow_public_responses")
      .notNull()
      .default(false),
    category: askHrCategoryEnum("category").notNull(),
    status: askHrStatusEnum("status").notNull().default("Open"),
    redirectedTo: integer("redirected_to").references(() => employees.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("ask_hr_questions_employee_idx").on(table.employeeId),
    index("ask_hr_questions_status_idx").on(table.status),
    index("ask_hr_questions_category_idx").on(table.category),
    index("ask_hr_questions_redirected_to_idx").on(table.redirectedTo),
  ],
);

// Responses table
export const askHrResponses = pgTable(
  "ask_hr_responses",
  {
    id: serial("id").primaryKey(),
    questionId: integer("question_id")
      .notNull()
      .references(() => askHrQuestions.id, { onDelete: "cascade" }),
    respondentId: integer("respondent_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    response: text("response").notNull(),
    isInternal: boolean("is_internal").notNull().default(false), // For HR internal notes
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("ask_hr_responses_question_idx").on(table.questionId),
    index("ask_hr_responses_respondent_idx").on(table.respondentId),
  ],
);

// Relations
export const askHrQuestionsRelations = relations(
  askHrQuestions,
  ({ one, many }) => ({
    employee: one(employees, {
      fields: [askHrQuestions.employeeId],
      references: [employees.id],
    }),
    redirectedToEmployee: one(employees, {
      fields: [askHrQuestions.redirectedTo],
      references: [employees.id],
    }),
    responses: many(askHrResponses),
  }),
);

export const askHrResponsesRelations = relations(askHrResponses, ({ one }) => ({
  question: one(askHrQuestions, {
    fields: [askHrResponses.questionId],
    references: [askHrQuestions.id],
  }),
  respondent: one(employees, {
    fields: [askHrResponses.respondentId],
    references: [employees.id],
  }),
}));
