"use server";

import { db } from "@/db";
import { eq, DrizzleQueryError, and, desc, sql } from "drizzle-orm";
import { getUser } from "../auth/dal";
import { revalidatePath } from "next/cache";
import {
  salaryStructure,
  salaryAllowances,
  allowances,
} from "@/db/schema/payroll";

interface AddAllowanceToStructureProps {
  salaryStructureId: number;
  allowanceId: number;
  effectiveFrom?: Date;
}

// Add an allowance to a salary structure
export async function addAllowanceToStructure(
  data: AddAllowanceToStructureProps,
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
            reason: "Cannot add allowances to an inactive salary structure",
          },
          success: null,
        };
      }

      // Check if allowance exists
      const allowance = await tx
        .select({ id: allowances.id })
        .from(allowances)
        .where(eq(allowances.id, data.allowanceId))
        .limit(1);

      if (allowance.length === 0) {
        return {
          error: { reason: "Allowance not found" },
          success: null,
        };
      }

      // Check if the allowance is already added to the structure
      const existing = await tx
        .select({ id: salaryAllowances.id })
        .from(salaryAllowances)
        .where(
          and(
            eq(salaryAllowances.salaryStructureId, data.salaryStructureId),
            eq(salaryAllowances.allowanceId, data.allowanceId),
            sql`${salaryAllowances.effectiveTo} IS NULL`,
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        return {
          error: { reason: "This allowance is already added to the structure" },
          success: null,
        };
      }

      // Add the allowance to the structure
      await tx.insert(salaryAllowances).values({
        salaryStructureId: data.salaryStructureId,
        allowanceId: data.allowanceId,
        effectiveFrom: data.effectiveFrom || new Date(),
      });

      revalidatePath(pathname);
      return {
        success: { reason: "Allowance added to salary structure successfully" },
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
        reason: "Couldn't add allowance to structure. Please try again later.",
      },
      success: null,
    };
  }
}

// Remove an allowance from a salary structure
export async function removeAllowanceFromStructure(
  salaryAllowanceId: number,
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
          id: salaryAllowances.id,
          structureId: salaryAllowances.salaryStructureId,
        })
        .from(salaryAllowances)
        .where(eq(salaryAllowances.id, salaryAllowanceId))
        .limit(1);

      if (relationship.length === 0) {
        return {
          error: { reason: "Salary structure allowance not found" },
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

      // Remove the allowance from the structure by setting effectiveTo to now
      await tx
        .update(salaryAllowances)
        .set({
          effectiveTo: new Date(),
        })
        .where(eq(salaryAllowances.id, salaryAllowanceId));

      revalidatePath(pathname);
      return {
        success: {
          reason: "Allowance removed from salary structure successfully",
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
          "Couldn't remove allowance from structure. Please try again later.",
      },
      success: null,
    };
  }
}

// Get all allowances for a salary structure
export async function getStructureAllowances(structureId: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const result = await db
      .select({
        id: salaryAllowances.id,
        structureId: salaryAllowances.salaryStructureId,
        allowanceId: salaryAllowances.allowanceId,
        effectiveFrom: salaryAllowances.effectiveFrom,
        allowanceName: allowances.name,
        allowanceType: allowances.type,
        amount: allowances.amount,
        percentage: allowances.percentage,
        taxable: allowances.taxable,
        taxPercentage: allowances.taxPercentage,
        description: allowances.description,
        effectiveTo: salaryAllowances.effectiveTo,
      })
      .from(salaryAllowances)
      .innerJoin(allowances, eq(salaryAllowances.allowanceId, allowances.id))
      .where(
        and(
          eq(salaryAllowances.salaryStructureId, structureId),
          sql`${salaryAllowances.effectiveTo} IS NULL`,
        ),
      )
      .orderBy(desc(salaryAllowances.effectiveFrom));

    return result;
  } catch (_error) {
    return [];
  }
}
