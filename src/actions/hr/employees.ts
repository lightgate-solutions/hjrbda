/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
// biome-ignore-all lint/style/noNonNullAssertion: <>

"use server";

import { db } from "@/db";
import { employees, employmentHistory, user } from "@/db/schema";
import { DrizzleQueryError, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth, requireHROrAdmin } from "@/actions/auth/dal";

export async function getAllEmployees() {
  await requireAuth();
  return await db
    .select({
      id: employees.id,
      email: employees.email,
      role: employees.role,
      name: employees.name,
      department: employees.department,
      employmentType: employees.employmentType,
      phone: employees.phone,
      isManager: employees.isManager,
      dateOfBirth: employees.dateOfBirth,
      staffNumber: employees.staffNumber,
      status: employees.status,
      maritalStatus: employees.maritalStatus,
      startDate: employmentHistory.startDate,
    })
    .from(employees)
    .leftJoin(
      employmentHistory,
      eq(employees.id, employmentHistory.employeeId),
    );
}

export async function getEmployee(employeeId: number) {
  await requireAuth();
  return await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1)
    .then((res) => res[0]);
}

export async function updateEmployee(
  employeeId: number,
  updates: Partial<{
    name: string;
    email: string;
    phone: string;
    staffNumber: string;
    isManager: boolean;
    department: string;
    managerId: number | null;
    dateOfBirth: string;
    address: string;
    maritalStatus: string;
    employmentType: string;
  }>,
) {
  await requireHROrAdmin();
  const processedUpdates: any = { ...updates, updatedAt: new Date() };

  for (const key in processedUpdates) {
    if (processedUpdates[key] === "") {
      processedUpdates[key] = null;
    }
  }
  try {
    await db.transaction(async (tx) => {
      const [emp] = await tx
        .update(employees)
        .set(processedUpdates)
        .where(eq(employees.id, employeeId))
        .returning();

      await tx
        .update(user)
        .set({ name: updates.name, email: updates.email })
        .where(eq(user.id, emp.authId));
    });

    revalidatePath("/hr/employees");
    return {
      success: { reason: "Employee updated successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message },
      };
    }

    return {
      error: {
        reason: "Couldn't update employee. Check inputs and try again!",
      },
      success: null,
    };
  }
}
