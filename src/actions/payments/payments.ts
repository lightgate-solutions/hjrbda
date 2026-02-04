"use server";

import { db } from "@/db";
import { payments } from "@/db/schema/payments";
import { eq } from "drizzle-orm";
import { requireAuth, requireHROrAdmin } from "@/actions/auth/dal";

type PaymentStatus = "pending" | "successful" | "failed";

export async function createPayment(data: {
  payer_name: string;
  account_number: string;
  bank_name?: string;
  amount: string;
  description?: string;
}) {
  await requireAuth();
  try {
    const parsedAmount = Number(data.amount);
    const [payment] = await db
      .insert(payments)
      .values({
        ...data,
        amount: parsedAmount,
      })
      .returning();
    return payment;
  } catch (_error) {
    throw new Error("Failed to create payment");
  }
}

export async function getAllPayments() {
  await requireAuth();
  try {
    return await db.select().from(payments);
  } catch (_error) {
    throw new Error("Failed to fetch payments");
  }
}

export async function getApprovedPayments() {
  await requireAuth();
  try {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.payment_status, "successful"));
  } catch (_error) {
    throw new Error("Failed to fetch successful payments");
  }
}

export async function updatePaymentStatus(id: string, status: PaymentStatus) {
  await requireHROrAdmin();
  try {
    await db
      .update(payments)
      .set({ payment_status: status })
      .where(eq(payments.id, id));
  } catch (_error) {
    throw new Error("Failed to update payment status");
  }
}
