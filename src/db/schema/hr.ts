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

export const leaveStatusEnum = pgEnum("leave_status", [
  "Pending",
  "Approved",
  "Rejected",
  "Cancelled",
  "To be reviewed",
]);

export const leaveTypeEnum = pgEnum("leave_type", [
  "Annual",
  "Sick",
  "Personal",
  "Maternity",
  "Paternity",
  "Bereavement",
  "Unpaid",
  "Other",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "Approved",
  "Rejected",
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

// Leave Types table - configurable leave types
export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  maxDays: integer("max_days"),
  requiresApproval: boolean("requires_approval").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Annual Leave Settings - Global annual leave allocation
export const annualLeaveSettings = pgTable("annual_leave_settings", {
  id: serial("id").primaryKey(),
  allocatedDays: integer("allocated_days").notNull().default(30),
  year: integer("year").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Leave Applications table
export const leaveApplications = pgTable(
  "leave_applications",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    leaveType: leaveTypeEnum("leave_type").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    totalDays: integer("total_days").notNull(),
    reason: text("reason").notNull(),
    status: leaveStatusEnum("status").notNull().default("Pending"),
    approvedBy: integer("approved_by").references(() => employees.id),
    approvedAt: timestamp("approved_at"),
    rejectionReason: text("rejection_reason"),
    appliedAt: timestamp("applied_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("leave_applications_employee_idx").on(table.employeeId),
    index("leave_applications_status_idx").on(table.status),
    index("leave_applications_dates_idx").on(table.startDate, table.endDate),
  ],
);

// Leave Balances table - tracks remaining leave days per employee
export const leaveBalances = pgTable(
  "leave_balances",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    leaveType: leaveTypeEnum("leave_type").notNull(),
    totalDays: integer("total_days").notNull().default(0),
    usedDays: integer("used_days").notNull().default(0),
    remainingDays: integer("remaining_days").notNull().default(0),
    year: integer("year").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("leave_balances_employee_idx").on(table.employeeId),
    index("leave_balances_type_year_idx").on(table.leaveType, table.year),
  ],
);

export const attendanceSettings = pgTable("attendance_settings", {
  id: serial("id").primaryKey(),
  signInStartTime: text("sign_in_start_time").notNull().default("06:00"),
  signInEndTime: text("sign_in_end_time").notNull().default("09:00"),
  signOutStartTime: text("sign_out_start_time").notNull().default("14:00"),
  signOutEndTime: text("sign_out_end_time").notNull().default("20:00"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const attendance = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    signInTime: timestamp("sign_in_time"),
    signOutTime: timestamp("sign_out_time"),
    signInLatitude: numeric("sign_in_latitude", { precision: 10, scale: 8 }),
    signInLongitude: numeric("sign_in_longitude", { precision: 11, scale: 8 }),
    signInLocation: text("sign_in_location"),
    status: attendanceStatusEnum("status").default("Approved").notNull(),
    rejectionReason: text("rejection_reason"),
    rejectedBy: integer("rejected_by").references(() => employees.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("attendance_employee_date_idx").on(table.employeeId, table.date),
  ],
);

export const employeeRelations = relations(employees, ({ one, many }) => ({
  manager: one(employees, {
    fields: [employees.managerId],
    references: [employees.id],
  }),

  leaveApplications: many(leaveApplications),
  leaveBalances: many(leaveBalances),
  approvedLeaves: many(leaveApplications, {
    relationName: "approvedBy",
  }),
  attendance: many(attendance),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  employee: one(employees, {
    fields: [attendance.employeeId],
    references: [employees.id],
  }),
}));
