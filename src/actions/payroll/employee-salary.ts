"use server";

import { db } from "@/db";
import { eq, and, isNull, desc, sql, DrizzleQueryError } from "drizzle-orm";
import { getUser } from "../auth/dal";
import { revalidatePath } from "next/cache";
import { employees } from "@/db/schema/hr";
import { employeeSalary, salaryStructure } from "@/db/schema/payroll";

export async function getEmployeesBySalaryStructure(structureId: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    // Get employees currently assigned to this structure
    const result = await db
      .select({
        id: employees.id,
        name: employees.name,
        staffNumber: employees.staffNumber,
        department: employees.department,
        role: employees.role,
        salaryId: employeeSalary.id,
        effectiveFrom: employeeSalary.effectiveFrom,
      })
      .from(employeeSalary)
      .innerJoin(employees, eq(employeeSalary.employeeId, employees.id))
      .where(
        and(
          eq(employeeSalary.salaryStructureId, structureId),
          isNull(employeeSalary.effectiveTo),
        ),
      )
      .orderBy(desc(employeeSalary.effectiveFrom));

    return result;
  } catch (_error) {
    return [];
  }
}

export async function getEmployeeSalaryHistory(employeeId: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const history = await db
      .select({
        id: employeeSalary.id,
        salaryStructureId: employeeSalary.salaryStructureId,
        structureName: salaryStructure.name,
        baseSalary: salaryStructure.baseSalary,
        effectiveFrom: employeeSalary.effectiveFrom,
        effectiveTo: employeeSalary.effectiveTo,
      })
      .from(employeeSalary)
      .leftJoin(
        salaryStructure,
        eq(employeeSalary.salaryStructureId, salaryStructure.id),
      )
      .where(eq(employeeSalary.employeeId, employeeId))
      .orderBy(desc(employeeSalary.effectiveFrom));

    return history;
  } catch (_error) {
    return [];
  }
}

export async function getEmployeesNotInStructure(structureId: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    // Step 1: Get all employees
    const allEmployees = await db
      .select({
        id: employees.id,
        name: employees.name,
        staffNumber: employees.staffNumber,
        department: employees.department,
        role: employees.role,
      })
      .from(employees)
      .orderBy(employees.name);

    if (allEmployees.length === 0) {
      return [];
    }

    // Step 2: Get employees already in this structure
    const assignedEmployeeIds = await db
      .select({ employeeId: employeeSalary.employeeId })
      .from(employeeSalary)
      .where(
        and(
          eq(employeeSalary.salaryStructureId, structureId),
          isNull(employeeSalary.effectiveTo),
        ),
      );

    const assignedIds = new Set(assignedEmployeeIds.map((e) => e.employeeId));

    // Step 3: Get current structures for all employees
    const employeeStructures = await db
      .select({
        employeeId: employeeSalary.employeeId,
        structureId: employeeSalary.salaryStructureId,
        structureName: salaryStructure.name,
      })
      .from(employeeSalary)
      .innerJoin(
        salaryStructure,
        eq(employeeSalary.salaryStructureId, salaryStructure.id),
      )
      .where(isNull(employeeSalary.effectiveTo));

    // Create lookup map for current structures
    const structureMap = new Map();
    for (const item of employeeStructures) {
      structureMap.set(item.employeeId, {
        structureId: item.structureId,
        structureName: item.structureName,
      });
    }

    // Filter employees not in this structure and add current structure info
    const availableEmployees = allEmployees
      .filter((emp) => !assignedIds.has(emp.id))
      .map((emp) => {
        const currentStructure = structureMap.get(emp.id);
        return {
          ...emp,
          currentStructureId: currentStructure?.structureId || null,
          currentStructureName: currentStructure?.structureName || null,
        };
      });

    return availableEmployees;
  } catch (_error) {
    return [];
  }
}

interface AssignEmployeeProps {
  employeeId: number;
  salaryStructureId: number;
  effectiveFrom: Date;
}

export async function assignEmployeeToStructure(
  data: AssignEmployeeProps,
  pathname: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    return await db.transaction(async (tx) => {
      // Check if structure exists
      const structure = await tx
        .select({
          id: salaryStructure.id,
          active: salaryStructure.active,
          employeeCount: salaryStructure.employeeCount,
        })
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
            reason: "Cannot assign employees to an inactive salary structure",
          },
          success: null,
        };
      }

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

      // Check if employee already has a current structure
      const currentStructure = await tx
        .select({
          id: employeeSalary.id,
          structureId: employeeSalary.salaryStructureId,
        })
        .from(employeeSalary)
        .where(
          and(
            eq(employeeSalary.employeeId, data.employeeId),
            isNull(employeeSalary.effectiveTo),
          ),
        )
        .limit(1);

      // If employee has a current structure, mark it as ended
      if (currentStructure.length > 0) {
        // If it's the same structure, no need to make changes
        if (currentStructure[0].structureId === data.salaryStructureId) {
          return {
            error: { reason: "Employee is already assigned to this structure" },
            success: null,
          };
        }

        // Update the old record to set end date
        await tx
          .update(employeeSalary)
          .set({
            effectiveTo: data.effectiveFrom,
            updatedAt: new Date(),
          })
          .where(eq(employeeSalary.id, currentStructure[0].id));

        // Decrease employee count on the old structure
        await tx
          .update(salaryStructure)
          .set({
            employeeCount: sql`${salaryStructure.employeeCount} - 1`,
            updatedAt: new Date(),
            updatedBy: user.id,
          })
          .where(eq(salaryStructure.id, currentStructure[0].structureId));
      }

      // Insert new employee salary record
      await tx.insert(employeeSalary).values({
        employeeId: data.employeeId,
        salaryStructureId: data.salaryStructureId,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: null, // Still active
      });

      // Increase employee count on the new structure
      await tx
        .update(salaryStructure)
        .set({
          employeeCount: sql`${salaryStructure.employeeCount} + 1`,
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(salaryStructure.id, data.salaryStructureId));

      revalidatePath(pathname);
      return {
        success: {
          reason: `Successfully assigned ${employee[0].name} to the salary structure`,
          employee: employee[0].name,
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
          "Couldn't assign employee to the salary structure. Please try again later.",
      },
      success: null,
    };
  }
}

export async function removeEmployeeFromStructure(
  employeeSalaryId: number,
  salaryStructureId: number,
  effectiveDate: Date,
  pathname: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    return await db.transaction(async (tx) => {
      await tx
        .update(employeeSalary)
        .set({
          effectiveTo: effectiveDate,
          updatedAt: new Date(),
        })
        .where(eq(employeeSalary.id, employeeSalaryId));

      await tx
        .update(salaryStructure)
        .set({
          employeeCount: sql`${salaryStructure.employeeCount} - 1`,
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(salaryStructure.id, salaryStructureId));

      revalidatePath(pathname);
      return {
        success: {
          reason: "Employee has been removed from the salary structure",
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
          "Couldn't remove employee from the salary structure. Please try again later.",
      },
      success: null,
    };
  }
}
