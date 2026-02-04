import {
  pgTable,
  text,
  uuid,
  timestamp,
  serial,
  pgEnum,
} from "drizzle-orm/pg-core";

export const paymentStatusType = pgEnum("payment_status_type", [
  "successful",
  "pending",
  "failed",
]);

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),

  payer_name: text("payer_name").notNull(),
  account_number: text("account_number").notNull(),
  bank_name: text("bank_name"),
  amount: serial("amount").notNull(),
  currency: text("currency").default("NGN"),

  payment_reference: text("payment_reference"),
  payment_date: timestamp("payment_date").defaultNow(),

  payment_status: paymentStatusType("payment_status_type").default("pending"),
  description: text("description"),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
