"use server";

import { db } from "@/db";
import { eq, DrizzleQueryError, and, desc } from "drizzle-orm";
import { getUser } from "../auth/dal";
import { revalidatePath } from "next/cache";
import { employees } from "@/db/schema/hr";
import {
  employeeDeductions,
  deductions as deductionsSchema,
  salaryStructure,
} from "@/db/schema/payroll";

// Get all deductions for a specific employee
export async function getEmployeeDeductions(employeeId: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const result = await db
      .select({
        id: employeeDeductions.id,
        employeeId: employeeDeductions.employeeId,
        name: employeeDeductions.name,
        salaryStructureId: employeeDeductions.salaryStructureId,
        structureName: salaryStructure.name,
        amount: employeeDeductions.amount,
        percentage: employeeDeductions.percentage,
        originalAmount: employeeDeductions.originalAmount,
        remainingAmount: employeeDeductions.remainingAmount,
        active: employeeDeductions.active,
        effectiveFrom: employeeDeductions.effectiveFrom,
        effectiveTo: employeeDeductions.effectiveTo,
      })
      .from(employeeDeductions)
      .leftJoin(
        salaryStructure,
        eq(employeeDeductions.salaryStructureId, salaryStructure.id),
      )
      .where(eq(employeeDeductions.employeeId, employeeId))
      .orderBy(desc(employeeDeductions.effectiveFrom));

    return result;
  } catch (_error) {
    return [];
  }
}

// Get active deductions for a specific employee
export async function getActiveEmployeeDeductions(employeeId: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const result = await db
      .select({
        id: employeeDeductions.id,
        employeeId: employeeDeductions.employeeId,
        name: employeeDeductions.name,
        salaryStructureId: employeeDeductions.salaryStructureId,
        structureName: salaryStructure.name,
        amount: employeeDeductions.amount,
        percentage: employeeDeductions.percentage,
        originalAmount: employeeDeductions.originalAmount,
        remainingAmount: employeeDeductions.remainingAmount,
        active: employeeDeductions.active,
        effectiveFrom: employeeDeductions.effectiveFrom,
      })
      .from(employeeDeductions)
      .leftJoin(
        salaryStructure,
        eq(employeeDeductions.salaryStructureId, salaryStructure.id),
      )
      .where(
        and(
          eq(employeeDeductions.employeeId, employeeId),
          eq(employeeDeductions.active, true),
        ),
      )
      .orderBy(desc(employeeDeductions.effectiveFrom));

    return result;
  } catch (_error) {
    return [];
  }
}

// Get all available deduction types for creating employee-specific deductions
export async function getDeductionTypes() {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const result = await db
      .select({
        id: deductionsSchema.id,
        name: deductionsSchema.name,
        type: deductionsSchema.type,
        amount: deductionsSchema.amount,
        percentage: deductionsSchema.percentage,
      })
      .from(deductionsSchema)
      .orderBy(deductionsSchema.name);

    return result;
  } catch (_error) {
    return [];
  }
}

// Add deduction to employee
export async function addDeductionToEmployee(
  data: {
    employeeId: number;
    salaryStructureId: number;
    name: string;
    amount?: number;
    percentage?: number;
    originalAmount?: number;
    remainingAmount?: number;
    effectiveFrom?: Date;
  },
  pathname: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    return await db.transaction(async (tx) => {
      // Check if employee exists
      const employee = await tx
        .select({ id: employees.id, name: employees.name })
        .from(employees)
        .where(eq(employees.id, data.employeeId))
        .limit(1);

      if (employee.length === 0) {
        return {
          error: { reason: "Employee not found" },
          success: null,
        };
      }

      // Check if salary structure exists
      const structure = await tx
        .select({ id: salaryStructure.id, name: salaryStructure.name })
        .from(salaryStructure)
        .where(eq(salaryStructure.id, data.salaryStructureId))
        .limit(1);

      if (structure.length === 0) {
        return {
          error: { reason: "Salary structure not found" },
          success: null,
        };
      }

      // Validate the data
      if (!data.name.trim()) {
        return {
          error: { reason: "Deduction name is required" },
          success: null,
        };
      }

      if (!data.percentage && !data.amount) {
        return {
          error: { reason: "Either percentage or amount must be provided" },
          success: null,
        };
      }

      // If it's a loan or advance, original amount is required
      if (data.originalAmount && !data.remainingAmount) {
        data.remainingAmount = data.originalAmount;
      }

      // Add the deduction to the employee
      await tx.insert(employeeDeductions).values({
        name: data.name.trim(),
        employeeId: data.employeeId,
        salaryStructureId: data.salaryStructureId,
        amount: data.amount?.toString(),
        percentage: data.percentage?.toString(),
        originalAmount: data.originalAmount?.toString(),
        remainingAmount: data.remainingAmount?.toString(),
        active: true,
        effectiveFrom: data.effectiveFrom || new Date(),
      });

      revalidatePath(pathname);
      return {
        success: {
          reason: `${data.name} deduction successfully assigned to ${employee[0].name}`,
        },
        error: null,
      };
    });
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }

    return {
      error: {
        reason:
          "Couldn't assign deduction to employee. Please try again later.",
      },
      success: null,
    };
  }
}

// Update employee deduction
export async function updateEmployeeDeduction(
  deductionId: number,
  data: {
    name?: string;
    amount?: number;
    percentage?: number;
    originalAmount?: number;
    remainingAmount?: number;
    active?: boolean;
  },
  pathname: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    return await db.transaction(async (tx) => {
      // Check if the deduction exists
      const deduction = await tx
        .select({
          id: employeeDeductions.id,
          employeeId: employeeDeductions.employeeId,
          name: employeeDeductions.name,
        })
        .from(employeeDeductions)
        .where(eq(employeeDeductions.id, deductionId))
        .limit(1);

      if (deduction.length === 0) {
        return {
          error: { reason: "Employee deduction not found" },
          success: null,
        };
      }

      // Get employee name for the success message
      const employee = await tx
        .select({ name: employees.name })
        .from(employees)
        .where(eq(employees.id, deduction[0].employeeId))
        .limit(1);

      // Update the deduction
      await tx
        .update(employeeDeductions)
        .set({
          name: data.name?.trim() || deduction[0].name,
          amount: data.amount?.toString(),
          percentage: data.percentage?.toString(),
          originalAmount: data.originalAmount?.toString(),
          remainingAmount: data.remainingAmount?.toString(),
          active: data.active !== undefined ? data.active : undefined,
          updatedAt: new Date(),
        })
        .where(eq(employeeDeductions.id, deductionId));

      revalidatePath(pathname);
      return {
        success: {
          reason: `Deduction updated for ${employee[0].name}`,
        },
        error: null,
      };
    });
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }

    return {
      error: {
        reason: "Couldn't update employee deduction. Please try again later.",
      },
      success: null,
    };
  }
}

// Deactivate employee deduction
export async function deactivateEmployeeDeduction(
  deductionId: number,
  pathname: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    return await db.transaction(async (tx) => {
      // Check if the deduction exists
      const deduction = await tx
        .select({
          id: employeeDeductions.id,
          employeeId: employeeDeductions.employeeId,
          name: employeeDeductions.name,
        })
        .from(employeeDeductions)
        .where(eq(employeeDeductions.id, deductionId))
        .limit(1);

      if (deduction.length === 0) {
        return {
          error: { reason: "Employee deduction not found" },
          success: null,
        };
      }

      // Get employee name for the success message
      const employee = await tx
        .select({ name: employees.name })
        .from(employees)
        .where(eq(employees.id, deduction[0].employeeId))
        .limit(1);

      // Deactivate the deduction
      await tx
        .update(employeeDeductions)
        .set({
          active: false,
          effectiveTo: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(employeeDeductions.id, deductionId));

      revalidatePath(pathname);
      return {
        success: {
          reason: `${deduction[0].name} deduction deactivated for ${employee[0].name}`,
        },
        error: null,
      };
    });
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }

    return {
      error: {
        reason:
          "Couldn't deactivate employee deduction. Please try again later.",
      },
      success: null,
    };
  }
}
