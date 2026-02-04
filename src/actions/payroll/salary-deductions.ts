"use server";

import { db } from "@/db";
import { eq, DrizzleQueryError, and, desc, sql } from "drizzle-orm";
import { getUser } from "../auth/dal";
import { revalidatePath } from "next/cache";
import {
  salaryStructure,
  salaryDeductions,
  deductions,
} from "@/db/schema/payroll";

interface AddDeductionToStructureProps {
  salaryStructureId: number;
  deductionId: number;
  effectiveFrom?: Date;
}

// Add a deduction to a salary structure
export async function addDeductionToStructure(
  data: AddDeductionToStructureProps,
  pathname: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    return await db.transaction(async (tx) => {
      // Check if structure exists
      const structure = await tx
        .select({ id: salaryStructure.id, active: salaryStructure.active })
        .from(salaryStructure)
        .where(eq(salaryStructure.id, data.salaryStructureId))
        .limit(1);

      if (structure.length === 0) {
        return {
          error: { reason: "Salary structure not found" },
          success: null,
        };
      }

      if (!structure[0].active) {
        return {
          error: {
            reason: "Cannot add deductions to an inactive salary structure",
          },
          success: null,
        };
      }

      // Check if deduction exists
      const deduction = await tx
        .select({ id: deductions.id })
        .from(deductions)
        .where(eq(deductions.id, data.deductionId))
        .limit(1);

      if (deduction.length === 0) {
        return {
          error: { reason: "Deduction not found" },
          success: null,
        };
      }

      // Check if the deduction is already added to the structure
      const existing = await tx
        .select({ id: salaryDeductions.id })
        .from(salaryDeductions)
        .where(
          and(
            eq(salaryDeductions.salaryStructureId, data.salaryStructureId),
            eq(salaryDeductions.deductionId, data.deductionId),
            sql`${salaryDeductions.effectiveTo} IS NULL`,
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        return {
          error: { reason: "This deduction is already added to the structure" },
          success: null,
        };
      }

      // Add the deduction to the structure
      await tx.insert(salaryDeductions).values({
        salaryStructureId: data.salaryStructureId,
        deductionId: data.deductionId,
        effectiveFrom: data.effectiveFrom || new Date(),
      });

      revalidatePath(pathname);
      return {
        success: { reason: "Deduction added to salary structure successfully" },
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
        reason: "Couldn't add deduction to structure. Please try again later.",
      },
      success: null,
    };
  }
}

// Remove a deduction from a salary structure
export async function removeDeductionFromStructure(
  salaryDeductionId: number,
  pathname: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    return await db.transaction(async (tx) => {
      // Check if the relationship exists
      const relationship = await tx
        .select({
          id: salaryDeductions.id,
          structureId: salaryDeductions.salaryStructureId,
        })
        .from(salaryDeductions)
        .where(eq(salaryDeductions.id, salaryDeductionId))
        .limit(1);

      if (relationship.length === 0) {
        return {
          error: { reason: "Salary structure deduction not found" },
          success: null,
        };
      }

      // Check if structure is active
      const structure = await tx
        .select({ active: salaryStructure.active })
        .from(salaryStructure)
        .where(eq(salaryStructure.id, relationship[0].structureId))
        .limit(1);

      if (structure.length === 0 || !structure[0].active) {
        return {
          error: { reason: "Cannot modify an inactive salary structure" },
          success: null,
        };
      }

      // Remove the deduction from the structure by setting effectiveTo to now
      await tx
        .update(salaryDeductions)
        .set({
          effectiveTo: new Date(),
        })
        .where(eq(salaryDeductions.id, salaryDeductionId));

      revalidatePath(pathname);
      return {
        success: {
          reason: "Deduction removed from salary structure successfully",
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
          "Couldn't remove deduction from structure. Please try again later.",
      },
      success: null,
    };
  }
}

// Get all deductions for a salary structure
export async function getStructureDeductions(structureId: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const result = await db
      .select({
        id: salaryDeductions.id,
        structureId: salaryDeductions.salaryStructureId,
        deductionId: salaryDeductions.deductionId,
        effectiveFrom: salaryDeductions.effectiveFrom,
        deductionName: deductions.name,
        deductionType: deductions.type,
        amount: deductions.amount,
        percentage: deductions.percentage,
        effectiveTo: salaryDeductions.effectiveTo,
      })
      .from(salaryDeductions)
      .innerJoin(deductions, eq(salaryDeductions.deductionId, deductions.id))
      .where(
        and(
          eq(salaryDeductions.salaryStructureId, structureId),
          sql`${salaryDeductions.effectiveTo} IS NULL`,
        ),
      )
      .orderBy(desc(salaryDeductions.effectiveFrom));

    return result;
  } catch (_error) {
    return [];
  }
}
