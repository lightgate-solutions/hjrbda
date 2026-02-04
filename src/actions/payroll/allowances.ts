"use server";

import { db } from "@/db";
import {
  eq,
  DrizzleQueryError,
  and,
  desc,
  sql,
  ne,
  inArray,
} from "drizzle-orm";
import { getUser } from "../auth/dal";
import { revalidatePath } from "next/cache";
import { employees } from "@/db/schema/hr";
import { allowances, type allowanceTypeEnum } from "@/db/schema/payroll";

interface CreateAllowanceProps {
  name: string;
  type: (typeof allowanceTypeEnum.enumValues)[number];
  percentage?: number;
  amount?: number;
  taxable: boolean;
  taxPercentage?: number;
  description: string;
}

export async function createAllowance(
  data: CreateAllowanceProps,
  pathname: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: allowances.id })
        .from(allowances)
        .where(eq(allowances.name, data.name.trim().toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        return {
          error: {
            reason: "Allowance with this name already exists",
          },
          success: null,
        };
      }

      // Validation for percentage or amount
      if (
        (data.percentage === undefined || data.percentage === 0) &&
        (data.amount === undefined || data.amount === 0)
      ) {
        return {
          error: {
            reason:
              "Either percentage or amount must be provided and greater than 0",
          },
          success: null,
        };
      }

      // If taxable, tax percentage is required
      if (data.taxable && (!data.taxPercentage || data.taxPercentage <= 0)) {
        return {
          error: {
            reason: "Tax percentage is required for taxable allowances",
          },
          success: null,
        };
      }

      await tx.insert(allowances).values({
        name: data.name.trim(),
        type: data.type,
        percentage: data.percentage?.toString(),
        amount: data.amount?.toString(),
        taxable: data.taxable,
        taxPercentage: data.taxPercentage?.toString(),
        description: data.description?.trim() || "",
        createdBy: user.id,
        updatedBy: user.id,
      });

      revalidatePath(pathname);
      return {
        success: {
          reason: "Allowance created successfully",
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
        reason: "Couldn't create allowance. Please check inputs and try again.",
      },
      success: null,
    };
  }
}

export async function getAllAllowances() {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const allAllowances = await db
      .select({
        id: allowances.id,
        name: allowances.name,
        type: allowances.type,
        percentage: allowances.percentage,
        amount: allowances.amount,
        taxable: allowances.taxable,
        taxPercentage: allowances.taxPercentage,
        description: allowances.description,
        createdById: allowances.createdBy,
        updatedAt: allowances.updatedAt,
      })
      .from(allowances)
      .orderBy(desc(allowances.updatedAt));

    const creatorIds = allAllowances
      .map((a) => a.createdById)
      .filter((id): id is number => id !== null);

    const creators =
      creatorIds.length > 0
        ? await db
            .select({
              id: employees.id,
              name: employees.name,
            })
            .from(employees)
            .where(inArray(employees.id, [...new Set(creatorIds)]))
        : [];

    const creatorsMap = creators.reduce(
      (map, creator) => {
        map[creator.id] = creator.name;
        return map;
      },
      {} as Record<number, string>,
    );

    return allAllowances.map((allowance) => ({
      ...allowance,
      createdBy: creatorsMap[allowance.createdById] || "Unknown",
    }));
  } catch (_error) {
    return [];
  }
}

export async function getAllAllowancesMonthly() {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const allAllowances = await db
      .select({
        id: allowances.id,
        name: allowances.name,
        type: allowances.type,
        percentage: allowances.percentage,
        amount: allowances.amount,
        taxable: allowances.taxable,
        taxPercentage: allowances.taxPercentage,
        description: allowances.description,
        createdById: allowances.createdBy,
        updatedAt: allowances.updatedAt,
      })
      .from(allowances)
      .where(ne(allowances.type, "one-time"))
      .orderBy(desc(allowances.updatedAt));

    const creatorIds = allAllowances
      .map((a) => a.createdById)
      .filter((id): id is number => id !== null);

    const creators =
      creatorIds.length > 0
        ? await db
            .select({
              id: employees.id,
              name: employees.name,
            })
            .from(employees)
            .where(inArray(employees.id, [...new Set(creatorIds)]))
        : [];

    const creatorsMap = creators.reduce(
      (map, creator) => {
        map[creator.id] = creator.name;
        return map;
      },
      {} as Record<number, string>,
    );

    return allAllowances.map((allowance) => ({
      ...allowance,
      createdBy: creatorsMap[allowance.createdById] || "Unknown",
    }));
  } catch (_error) {
    return [];
  }
}

export async function getAllowance(id: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const allowance = await db
      .select({
        id: allowances.id,
        name: allowances.name,
        type: allowances.type,
        percentage: allowances.percentage,
        amount: allowances.amount,
        taxable: allowances.taxable,
        taxPercentage: allowances.taxPercentage,
        description: allowances.description,
        createdById: allowances.createdBy,
        updatedAt: allowances.updatedAt,
      })
      .from(allowances)
      .where(eq(allowances.id, id))
      .limit(1);

    if (allowance.length === 0) {
      return null;
    }

    const creator = await db
      .select({ name: employees.name })
      .from(employees)
      .where(eq(employees.id, allowance[0].createdById))
      .limit(1);

    return {
      ...allowance[0],
      createdBy: creator.length > 0 ? creator[0].name : "Unknown",
    };
  } catch (_error) {
    return null;
  }
}

export async function updateAllowance(
  id: number,
  data: Partial<CreateAllowanceProps>,
  pathname: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: allowances.id })
        .from(allowances)
        .where(eq(allowances.id, id))
        .limit(1);

      if (existing.length === 0) {
        return {
          error: {
            reason: "Allowance not found",
          },
          success: null,
        };
      }

      if (data.name) {
        const nameExists = await tx
          .select({ id: allowances.id })
          .from(allowances)
          .where(
            and(
              eq(allowances.name, data.name.trim().toLowerCase()),
              sql`${allowances.id} != ${id}`,
            ),
          )
          .limit(1);

        if (nameExists.length > 0) {
          return {
            error: {
              reason: "Another allowance with this name already exists",
            },
            success: null,
          };
        }
      }

      // If updating taxable status to true, ensure tax percentage is provided
      if (data.taxable === true && !data.taxPercentage && !data.taxPercentage) {
        const currentAllowance = await tx
          .select({ taxPercentage: allowances.taxPercentage })
          .from(allowances)
          .where(eq(allowances.id, id))
          .limit(1);

        if (!currentAllowance[0].taxPercentage) {
          return {
            error: {
              reason: "Tax percentage is required for taxable allowances",
            },
            success: null,
          };
        }
      }

      await tx
        .update(allowances)
        .set({
          ...(data.name && { name: data.name.trim() }),
          ...(data.type && { type: data.type }),
          ...(data.percentage !== undefined && {
            percentage: data.percentage.toString(),
          }),
          ...(data.amount !== undefined && { amount: data.amount.toString() }),
          ...(data.taxable !== undefined && { taxable: data.taxable }),
          ...(data.taxPercentage !== undefined && {
            taxPercentage: data.taxPercentage.toString(),
          }),
          ...(data.description && { description: data.description.trim() }),
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(allowances.id, id));

      revalidatePath(pathname);
      return {
        success: {
          reason: "Allowance updated successfully",
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
        reason: "Couldn't update allowance. Please check inputs and try again.",
      },
      success: null,
    };
  }
}

export async function deleteAllowance(id: number, pathname: string) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: allowances.id })
        .from(allowances)
        .where(eq(allowances.id, id))
        .limit(1);

      if (existing.length === 0) {
        return {
          error: {
            reason: "Allowance not found",
          },
          success: null,
        };
      }

      // Here you might want to check if this allowance is used in any salary structure
      // or assigned to any employee before allowing deletion

      await tx.delete(allowances).where(eq(allowances.id, id));

      revalidatePath(pathname);
      return {
        success: {
          reason: "Allowance deleted successfully",
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
        reason: "Couldn't delete allowance. It might be in use.",
      },
      success: null,
    };
  }
}
