import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  index,
  date,
  integer,
  serial,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";
export const employmentTypeEnum = pgEnum("employment_type", [
  "Full-time",
  "Part-time",
  "Contract",
  "Intern",
]);

export const maritalStatusEnum = pgEnum("marital_status", [
  "Single",
  "Married",
  "Divorced",
  "Widowed",
]);

export const employees = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    authId: text("auth_id").notNull().default(""),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    staffNumber: text("staff_number"),
    role: text("role").notNull(),
    isManager: boolean("is_manager").notNull().default(false),
    department: text("department").notNull(),
    managerId: integer("manager_id"),
    dateOfBirth: date("date_of_birth"),
    address: text("address"),
    status: text("status"),
    maritalStatus: maritalStatusEnum("marital_status"),
    employmentType: employmentTypeEnum("employment_type"),
    documentCount: integer("document_count").default(0).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("employee_manager_idx").on(table.managerId),
    index("employees_department_role_idx").on(table.department, table.role),
  ],
);

export const employeesDocuments = pgTable("employees_documents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  documentName: text("document_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: numeric("file_size", { scale: 2, precision: 10 }).notNull(),
  mimeType: text("mime_type"),
  uploadedBy: integer("uploaded_by").references(() => employees.id),
  department: text("department").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const employeesBank = pgTable("employees_bank", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const employmentHistory = pgTable(
  "employment_history",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    startDate: date("start_date"),
    endDate: date("end_date"),
    department: text("department"),
    employmentType: employmentTypeEnum("employment_type"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("history_employee_idx").on(table.employeeId),
    index("employment_history_active_idx")
      .on(table.endDate)
      .where(sql`end_date IS NULL`),
  ],
);

export const employeeRelations = relations(employees, ({ one }) => ({
  manager: one(employees, {
    fields: [employees.managerId],
    references: [employees.id],
  }),
}));
