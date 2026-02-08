"use server";

import { db } from "@/db";
import { employeesBank } from "@/db/schema/hr";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import * as z from "zod";
import { requireAuth, requireHROrAdmin } from "@/actions/auth/dal";

const bankDetailsSchema = z.object({
  employeeId: z.number(),
  bankName: z.string().min(2, "Bank name is required"),
  accountName: z.string().min(2, "Account name is required"),
  accountNumber: z.string().min(5, "Valid account number is required"),
});

export type BankDetailsFormValues = z.infer<typeof bankDetailsSchema>;

export async function getEmployeeBankDetails(employeeId: number) {
  await requireAuth();
  try {
    const bankDetails = await db.query.employeesBank.findFirst({
      where: eq(employeesBank.employeeId, employeeId),
    });

    return bankDetails ?? null;
  } catch (_error) {
    throw new Error("Failed to fetch employee bank details");
  }
}

export async function saveBankDetails(data: BankDetailsFormValues) {
  await requireHROrAdmin();
  try {
    const { employeeId, bankName, accountName, accountNumber } =
      bankDetailsSchema.parse(data);

    // Check if bank details already exist for this employee
    const existingDetails = await db.query.employeesBank.findFirst({
      where: eq(employeesBank.employeeId, employeeId),
    });

    if (existingDetails) {
      // Update existing record
      await db
        .update(employeesBank)
        .set({
          bankName,
          accountName,
          accountNumber,
          updatedAt: new Date(),
        })
        .where(eq(employeesBank.id, existingDetails.id));
    } else {
      // Create new record
      await db.insert(employeesBank).values({
        employeeId,
        bankName,
        accountName,
        accountNumber,
      });
    }

    revalidateTag(`employee-bank-${employeeId}`);
    return { success: true, message: "Bank details saved successfully" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid bank details",
        errors: error.message,
      };
    }
    return { success: false, message: "Failed to save bank details" };
  }
}

export async function deleteBankDetails(employeeId: number) {
  await requireHROrAdmin();
  try {
    await db
      .delete(employeesBank)
      .where(eq(employeesBank.employeeId, employeeId));

    revalidateTag(`employee-bank-${employeeId}`);
    return { success: true, message: "Bank details deleted successfully" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Failed to delete",
      };
    }
    return { success: false, message: "Failed to delete bank details" };
  }
}
