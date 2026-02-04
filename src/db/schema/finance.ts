import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { employees } from "./hr";

export const companyBalance = pgTable("company_balance", {
  id: serial("id").primaryKey(),
  balance: numeric("balance", { precision: 15, scale: 2 })
    .default("0")
    .notNull(),
  currency: text("currency").default("NGN").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const companyExpenses = pgTable(
  "company_expenses",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    category: text("category"),
    expenseDate: timestamp("expense_date").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("company_expenses_date_idx").on(table.expenseDate)],
);

export const companyExpensesRelations = relations(companyExpenses, () => ({}));

export const balanceTransactions = pgTable(
  "balance_transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    transactionType: text("transaction_type").notNull().default("top-up"), // top-up, expense, adjustment
    description: text("description"),
    balanceBefore: numeric("balance_before", {
      precision: 15,
      scale: 2,
    }).notNull(),
    balanceAfter: numeric("balance_after", {
      precision: 15,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("balance_transactions_user_idx").on(table.userId),
    index("balance_transactions_date_idx").on(table.createdAt),
    index("balance_transactions_type_idx").on(table.transactionType),
  ],
);

export const balanceTransactionsRelations = relations(
  balanceTransactions,
  ({ one }) => ({
    user: one(employees, {
      fields: [balanceTransactions.userId],
      references: [employees.id],
    }),
  }),
);
