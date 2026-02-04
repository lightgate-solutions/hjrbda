"use server";

import { db } from "@/db";
import { eq, DrizzleQueryError, and, desc, inArray, sql } from "drizzle-orm";
import { getUser } from "../auth/dal";
import { revalidatePath } from "next/cache";
import { employees } from "@/db/schema/hr";
import { salaryStructure } from "@/db/schema/payroll";

interface CreateSalaryStructureProps {
  name: string;
  baseSalary: number;
  description?: string;
}

export async function createSalaryStructure(
  data: CreateSalaryStructureProps,
  pathname: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: salaryStructure.id })
        .from(salaryStructure)
        .where(eq(salaryStructure.name, data.name.trim().toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        return {
          error: {
            reason: "Salary structure with this name already exists",
          },
          success: null,
        };
      }

      await tx.insert(salaryStructure).values({
        name: data.name.trim(),
        baseSalary: data.baseSalary.toString(),
        description: data.description?.trim(),
        active: true,
        employeeCount: 0,
        createdBy: user.id,
        updatedBy: user.id,
      });

      revalidatePath(pathname);
      return {
        success: {
          reason: "Salary structure created successfully",
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
          "Couldn't create salary structure. Please check inputs and try again.",
      },
      success: null,
    };
  }
}

export async function getAllSalaryStructures() {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const structures = await db
      .select({
        id: salaryStructure.id,
        name: salaryStructure.name,
        baseSalary: salaryStructure.baseSalary,
        description: salaryStructure.description,
        active: salaryStructure.active,
        employeeCount: salaryStructure.employeeCount,
        createdById: salaryStructure.createdBy,
        updatedAt: salaryStructure.updatedAt,
      })
      .from(salaryStructure)
      .orderBy(desc(salaryStructure.updatedAt));

    const creatorIds = [...new Set(structures.map((s) => s.createdById))];

    const creators =
      creatorIds.length > 0
        ? await db
            .select({
              id: employees.id,
              name: employees.name,
            })
            .from(employees)
            .where(inArray(employees.id, creatorIds))
        : [];

    const creatorsMap = creators.reduce(
      (map, creator) => {
        map[creator.id] = creator.name;
        return map;
      },
      {} as Record<number, string>,
    );

    return structures.map((structure) => ({
      ...structure,
      createdBy: creatorsMap[structure.createdById] || "Unknown",
    }));
  } catch (_error) {
    return [];
  }
}

export async function getSalaryStructure(id: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const structure = await db
      .select({
        id: salaryStructure.id,
        name: salaryStructure.name,
        baseSalary: salaryStructure.baseSalary,
        description: salaryStructure.description,
        active: salaryStructure.active,
        employeeCount: salaryStructure.employeeCount,
        createdById: salaryStructure.createdBy,
        updatedAt: salaryStructure.updatedAt,
      })
      .from(salaryStructure)
      .where(eq(salaryStructure.id, id))
      .limit(1);

    if (structure.length === 0) {
      return null;
    }

    const creator = await db
      .select({ name: employees.name })
      .from(employees)
      .where(eq(employees.id, structure[0].createdById))
      .limit(1);

    return {
      ...structure[0],
      createdBy: creator.length > 0 ? creator[0].name : "Unknown",
    };
  } catch (_error) {
    return null;
  }
}

export async function updateSalaryStructure(
  id: number,
  data: Partial<CreateSalaryStructureProps>,
  pathname: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: salaryStructure.id })
        .from(salaryStructure)
        .where(eq(salaryStructure.id, id))
        .limit(1);

      if (existing.length === 0) {
        return {
          error: {
            reason: "Salary structure not found",
          },
          success: null,
        };
      }

      if (data.name) {
        const nameExists = await tx
          .select({ id: salaryStructure.id })
          .from(salaryStructure)
          .where(
            and(
              eq(salaryStructure.name, data.name.trim().toLowerCase()),
              sql`${salaryStructure.id} != ${id}`,
            ),
          )
          .limit(1);

        if (nameExists.length > 0) {
          return {
            error: {
              reason: "Another salary structure with this name already exists",
            },
            success: null,
          };
        }
      }

      await tx
        .update(salaryStructure)
        .set({
          ...(data.name && { name: data.name.trim() }),
          ...(data.baseSalary && { baseSalary: data.baseSalary.toString() }),
          ...(data.description && { description: data.description.trim() }),
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(salaryStructure.id, id));

      revalidatePath(pathname);
      return {
        success: {
          reason: "Salary structure updated successfully",
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
          "Couldn't update salary structure. Please check inputs and try again.",
      },
      success: null,
    };
  }
}

export async function toggleSalaryStructureStatus(
  id: number,
  active: boolean,
  pathname: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select({
          id: salaryStructure.id,
          employeeCount: salaryStructure.employeeCount,
        })
        .from(salaryStructure)
        .where(eq(salaryStructure.id, id))
        .limit(1);

      if (existing.length === 0) {
        return {
          error: {
            reason: "Salary structure not found",
          },
          success: null,
        };
      }

      if (!active && existing[0].employeeCount > 0) {
        return {
          error: {
            reason:
              "Cannot deactivate a salary structure that has employees assigned to it",
          },
          success: null,
        };
      }

      await tx
        .update(salaryStructure)
        .set({
          active,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(salaryStructure.id, id));

      revalidatePath(pathname);
      return {
        success: {
          reason: active
            ? "Salary structure activated successfully"
            : "Salary structure deactivated successfully",
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
          "Couldn't update salary structure status. Please try again later.",
      },
      success: null,
    };
  }
}
