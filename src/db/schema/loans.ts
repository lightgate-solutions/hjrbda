import {
  pgTable,
  text,
  timestamp,
  index,
  serial,
  numeric,
  integer,
  boolean,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { employees } from "./hr";
import { salaryStructure, employeeDeductions } from "./payroll";
import { sql } from "drizzle-orm";

// Loan amount type: fixed amount or percentage of salary
export const loanAmountTypeEnum = pgEnum("loan_amount_type", [
  "fixed",
  "percentage",
]);

// Loan application status
export const loanApplicationStatusEnum = pgEnum("loan_application_status", [
  "pending", // Employee submitted
  "hr_approved", // HR approved, waiting for finance
  "hr_rejected", // HR rejected
  "disbursed", // Finance disbursed
  "active", // Loan is active with deductions
  "completed", // Loan fully repaid
  "cancelled", // Cancelled by employee or admin
]);

// Repayment status
export const repaymentStatusEnum = pgEnum("repayment_status", [
  "pending",
  "paid",
  "partial",
  "overdue",
  "waived",
]);

// Loan Types - configurable by HR/Admin
export const loanTypes = pgTable(
  "loan_types",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    description: text("description"),
    amountType: loanAmountTypeEnum("amount_type").notNull().default("fixed"),
    // For fixed amount type
    fixedAmount: numeric("fixed_amount", { precision: 15, scale: 2 }),
    // For percentage type (percentage of base salary)
    maxPercentage: numeric("max_percentage", { precision: 5, scale: 2 }),
    // Tenure in months
    tenureMonths: integer("tenure_months").notNull(),
    // Interest rate (annual percentage)
    interestRate: numeric("interest_rate", {
      precision: 5,
      scale: 2,
    }).default("0"),
    // Eligibility rules
    minServiceMonths: integer("min_service_months").default(0), // Minimum months of service
    maxActiveLoans: integer("max_active_loans").default(1), // Max concurrent loans of this type
    // Status
    isActive: boolean("is_active").notNull().default(true),
    // Audit fields
    createdBy: integer("created_by")
      .references(() => employees.id, { onDelete: "no action" })
      .notNull(),
    updatedBy: integer("updated_by")
      .references(() => employees.id, { onDelete: "no action" })
      .notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("loan_type_active_idx").on(table.isActive),
    index("loan_type_name_idx").on(table.name),
  ],
);

// Junction table: Loan Types to Salary Structures
// Defines which salary structures are eligible for which loan types
export const loanTypeSalaryStructures = pgTable(
  "loan_type_salary_structures",
  {
    id: serial("id").primaryKey(),
    loanTypeId: integer("loan_type_id")
      .references(() => loanTypes.id, { onDelete: "cascade" })
      .notNull(),
    salaryStructureId: integer("salary_structure_id")
      .references(() => salaryStructure.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("unique_loan_type_salary_structure").on(
      table.loanTypeId,
      table.salaryStructureId,
    ),
    index("loan_type_structure_loan_idx").on(table.loanTypeId),
    index("loan_type_structure_salary_idx").on(table.salaryStructureId),
  ],
);

// Loan Applications
export const loanApplications = pgTable(
  "loan_applications",
  {
    id: serial("id").primaryKey(),
    // Application reference number
    referenceNumber: text("reference_number").notNull().unique(),
    // Employee applying
    employeeId: integer("employee_id")
      .references(() => employees.id, { onDelete: "cascade" })
      .notNull(),
    // Loan type
    loanTypeId: integer("loan_type_id")
      .references(() => loanTypes.id, { onDelete: "restrict" })
      .notNull(),
    // Requested amount
    requestedAmount: numeric("requested_amount", {
      precision: 15,
      scale: 2,
    }).notNull(),
    // Approved amount (can be different from requested)
    approvedAmount: numeric("approved_amount", { precision: 15, scale: 2 }),
    // Calculated monthly deduction
    monthlyDeduction: numeric("monthly_deduction", { precision: 15, scale: 2 }),
    // Tenure
    tenureMonths: integer("tenure_months").notNull(),
    // Reason for loan
    reason: text("reason").notNull(),
    // Status
    status: loanApplicationStatusEnum("status").notNull().default("pending"),
    // HR Review
    hrReviewedBy: integer("hr_reviewed_by").references(() => employees.id, {
      onDelete: "set null",
    }),
    hrReviewedAt: timestamp("hr_reviewed_at"),
    hrRemarks: text("hr_remarks"),
    // Finance Disbursement
    disbursedBy: integer("disbursed_by").references(() => employees.id, {
      onDelete: "set null",
    }),
    disbursedAt: timestamp("disbursed_at"),
    disbursementRemarks: text("disbursement_remarks"),
    // Link to employee deduction (created after disbursement)
    employeeDeductionId: integer("employee_deduction_id").references(
      () => employeeDeductions.id,
      { onDelete: "set null" },
    ),
    // Tracking
    totalRepaid: numeric("total_repaid", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    remainingBalance: numeric("remaining_balance", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    // Timestamps
    appliedAt: timestamp("applied_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("loan_app_employee_idx").on(table.employeeId),
    index("loan_app_type_idx").on(table.loanTypeId),
    index("loan_app_status_idx").on(table.status),
    index("loan_app_reference_idx").on(table.referenceNumber),
    index("loan_app_hr_reviewed_idx").on(table.hrReviewedBy),
    index("loan_app_disbursed_idx").on(table.disbursedBy),
    index("loan_app_active_idx")
      .on(table.employeeId, table.status)
      .where(sql`status IN ('active', 'disbursed', 'hr_approved', 'pending')`),
  ],
);

// Loan Repayment Schedule
export const loanRepayments = pgTable(
  "loan_repayments",
  {
    id: serial("id").primaryKey(),
    loanApplicationId: integer("loan_application_id")
      .references(() => loanApplications.id, { onDelete: "cascade" })
      .notNull(),
    employeeId: integer("employee_id")
      .references(() => employees.id, { onDelete: "cascade" })
      .notNull(),
    // Schedule info
    installmentNumber: integer("installment_number").notNull(),
    dueDate: timestamp("due_date").notNull(),
    // Amounts
    expectedAmount: numeric("expected_amount", {
      precision: 15,
      scale: 2,
    }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    // Balance after this payment
    balanceAfter: numeric("balance_after", { precision: 15, scale: 2 }),
    // Status
    status: repaymentStatusEnum("status").notNull().default("pending"),
    // Payment tracking
    paidAt: timestamp("paid_at"),
    // Link to payrun that processed this payment
    payrunId: integer("payrun_id"),
    payrunItemId: integer("payrun_item_id"),
    // Notes
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("loan_repayment_loan_idx").on(table.loanApplicationId),
    index("loan_repayment_employee_idx").on(table.employeeId),
    index("loan_repayment_status_idx").on(table.status),
    index("loan_repayment_due_idx").on(table.dueDate),
    unique("unique_loan_installment").on(
      table.loanApplicationId,
      table.installmentNumber,
    ),
  ],
);

// Loan History/Audit Log
export const loanHistory = pgTable(
  "loan_history",
  {
    id: serial("id").primaryKey(),
    loanApplicationId: integer("loan_application_id")
      .references(() => loanApplications.id, { onDelete: "cascade" })
      .notNull(),
    action: text("action").notNull(), // e.g., "applied", "hr_approved", "disbursed", "payment_received"
    description: text("description").notNull(),
    performedBy: integer("performed_by").references(() => employees.id, {
      onDelete: "set null",
    }),
    metadata: text("metadata"), // JSON string for additional data
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("loan_history_loan_idx").on(table.loanApplicationId),
    index("loan_history_action_idx").on(table.action),
    index("loan_history_date_idx").on(table.createdAt),
  ],
);
