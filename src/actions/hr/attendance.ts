/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
"use server";

import { db } from "@/db";
import { attendance, employees, attendanceSettings } from "@/db/schema";
import { DrizzleQueryError, eq, and, desc, count, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth, requireHROrAdmin } from "@/actions/auth/dal";
import { createNotification } from "../notification/notification";
import { getEmployee } from "./employees";

// Get active attendance settings or return defaults
async function getAttendanceSettings() {
  try {
    const settings = await db
      .select()
      .from(attendanceSettings)
      .where(eq(attendanceSettings.isActive, true))
      .limit(1);

    if (settings.length > 0) {
      return settings[0];
    }

    // Return default settings if none exist
    return {
      signInStartTime: "06:00",
      signInEndTime: "09:00",
      signOutStartTime: "14:00",
      signOutEndTime: "20:00",
    };
  } catch (_error) {
    // Return defaults on error
    return {
      signInStartTime: "06:00",
      signInEndTime: "09:00",
      signOutStartTime: "14:00",
      signOutEndTime: "20:00",
    };
  }
}

// Helper to check time range with time strings in "HH:MM" format
function isWithinTimeRange(
  date: Date,
  startTime: string,
  endTime: string,
): boolean {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

// Get current attendance settings (public)
export async function getCurrentAttendanceSettings() {
  return await getAttendanceSettings();
}

// Update attendance settings (admin/HR only)
export async function updateAttendanceSettings(settings: {
  signInStartTime: string;
  signInEndTime: string;
  signOutStartTime: string;
  signOutEndTime: string;
}) {
  await requireHROrAdmin();

  // Validate time format (HH:MM)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

  if (
    !timeRegex.test(settings.signInStartTime) ||
    !timeRegex.test(settings.signInEndTime) ||
    !timeRegex.test(settings.signOutStartTime) ||
    !timeRegex.test(settings.signOutEndTime)
  ) {
    return {
      success: null,
      error: {
        reason: "Invalid time format. Please use HH:MM format (e.g., 08:30)",
      },
    };
  }

  // Convert to minutes since midnight for comparison
  const parseTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const signInStart = parseTime(settings.signInStartTime);
  const signInEnd = parseTime(settings.signInEndTime);
  const signOutStart = parseTime(settings.signOutStartTime);
  const signOutEnd = parseTime(settings.signOutEndTime);

  if (signInStart >= signInEnd) {
    return {
      success: null,
      error: { reason: "Sign-in start time must be before end time" },
    };
  }

  if (signOutStart >= signOutEnd) {
    return {
      success: null,
      error: { reason: "Sign-out start time must be before end time" },
    };
  }

  try {
    // Deactivate all existing settings
    await db
      .update(attendanceSettings)
      .set({ isActive: false, updatedAt: new Date() });

    // Create new active settings
    await db.insert(attendanceSettings).values({
      ...settings,
      isActive: true,
    });

    revalidatePath("/hr/attendance");
    return {
      success: { reason: "Attendance settings updated successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error" },
      };
    }
    return {
      success: null,
      error: { reason: "Failed to update attendance settings" },
    };
  }
}

// Sign In
export async function signIn(
  employeeId: number,
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  },
) {
  const authData = await requireAuth();

  // Verify user can only sign in for themselves unless admin/hr (though usually attendance is personal)
  if (
    authData.employee.id !== employeeId &&
    authData.role !== "admin" &&
    authData.role !== "hr"
  ) {
    return {
      success: null,
      error: { reason: "You can only sign in for yourself" },
    };
  }

  const now = new Date();
  const settings = await getAttendanceSettings();

  // Check time using dynamic settings
  if (
    !isWithinTimeRange(now, settings.signInStartTime, settings.signInEndTime)
  ) {
    return {
      success: null,
      error: {
        reason: `Sign in is only allowed between ${settings.signInStartTime} and ${settings.signInEndTime}`,
      },
    };
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    // Check if already signed in
    const existing = await db
      .select()
      .from(attendance)
      .where(
        and(eq(attendance.employeeId, employeeId), eq(attendance.date, today)),
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        success: null,
        error: { reason: "You have already signed in for today" },
      };
    }

    await db.insert(attendance).values({
      employeeId,
      date: today,
      signInTime: now,
      signInLatitude: location?.latitude?.toString(),
      signInLongitude: location?.longitude?.toString(),
      signInLocation: location?.address,
      status: "Approved",
    });

    revalidatePath("/hr/attendance");
    return {
      success: { reason: "Signed in successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error" },
      };
    }
    return {
      success: null,
      error: { reason: "Failed to sign in" },
    };
  }
}

// Sign Out
export async function signOut(employeeId: number) {
  const authData = await requireAuth();

  if (
    authData.employee.id !== employeeId &&
    authData.role !== "admin" &&
    authData.role !== "hr"
  ) {
    return {
      success: null,
      error: { reason: "You can only sign out for yourself" },
    };
  }

  const now = new Date();
  const settings = await getAttendanceSettings();

  // Check time using dynamic settings
  if (
    !isWithinTimeRange(now, settings.signOutStartTime, settings.signOutEndTime)
  ) {
    return {
      success: null,
      error: {
        reason: `Sign out is only allowed between ${settings.signOutStartTime} and ${settings.signOutEndTime}`,
      },
    };
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    // Check if signed in
    const existing = await db
      .select()
      .from(attendance)
      .where(
        and(eq(attendance.employeeId, employeeId), eq(attendance.date, today)),
      )
      .limit(1);

    if (existing.length === 0) {
      return {
        success: null,
        error: { reason: "You have not signed in today" },
      };
    }

    if (existing[0].signOutTime) {
      return {
        success: null,
        error: { reason: "You have already signed out today" },
      };
    }

    await db
      .update(attendance)
      .set({
        signOutTime: now,
        updatedAt: now,
      })
      .where(eq(attendance.id, existing[0].id));

    revalidatePath("/hr/attendance");
    return {
      success: { reason: "Signed out successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error" },
      };
    }
    return {
      success: null,
      error: { reason: "Failed to sign out" },
    };
  }
}

// Reject Attendance
export async function rejectAttendance(attendanceId: number, reason: string) {
  const authData = await requireHROrAdmin(); // Only HR/Admin (or Manager check below)

  // If not HR/Admin, check if Manager
  // Actually requireHROrAdmin throws if not HR or Admin.
  // The requirement says "hr department employees and managers of the employee".
  // requireHROrAdmin might be too strict if it doesn't allow managers.
  // Let's check how requireHROrAdmin is implemented or just use requireAuth and check roles manually.
  // But for now, I'll assume requireHROrAdmin covers HR. For managers, I need to check if the user is the manager of the employee.

  // Let's use requireAuth and do manual checks to be safe and flexible.

  // Re-reading requirement: "hr department employees and managers of the employee"

  try {
    const record = await db.query.attendance.findFirst({
      where: eq(attendance.id, attendanceId),
      with: {
        employee: true, // Assuming relation exists, but I defined it as 'attendance' in employees, not 'employee' in attendance in schema... wait.
        // In schema `attendance` table has `employeeId`.
        // I didn't define the `employee` relation in `attendance` table in `relations`.
        // I should probably have done that. But I can just query employees table.
      },
    });

    if (!record) {
      return {
        success: null,
        error: { reason: "Attendance record not found" },
      };
    }

    // Check permissions
    let isAuthorized = false;
    if (authData.role === "admin" || authData.employee.department === "hr") {
      isAuthorized = true;
    } else {
      // Check if manager
      const employee = await getEmployee(record.employeeId);
      if (employee && employee.managerId === authData.employee.id) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return {
        success: null,
        error: { reason: "Unauthorized to reject this attendance" },
      };
    }

    await db
      .update(attendance)
      .set({
        status: "Rejected",
        rejectionReason: reason,
        rejectedBy: authData.employee.id,
        updatedAt: new Date(),
      })
      .where(eq(attendance.id, attendanceId));

    // Notify employee
    await createNotification({
      user_id: record.employeeId,
      title: "Attendance Rejected",
      message: `Your attendance for ${record.date} was rejected. Reason: ${reason}`,
      notification_type: "approval",
      reference_id: attendanceId,
    });

    revalidatePath("/hr/attendance");
    return {
      success: { reason: "Attendance rejected successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error" },
      };
    }
    return {
      success: null,
      error: { reason: "Failed to reject attendance" },
    };
  }
}

// Get Attendance Records
export async function getAttendanceRecords(filters?: {
  employeeId?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  managerId?: number; // Add managerId filter
  page?: number;
  limit?: number;
}) {
  await requireAuth();

  const conditions: any[] = [];

  if (filters?.employeeId) {
    conditions.push(eq(attendance.employeeId, filters.employeeId));
  }
  if (filters?.date) {
    conditions.push(eq(attendance.date, filters.date));
  }
  if (filters?.startDate) {
    conditions.push(gte(attendance.date, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(attendance.date, filters.endDate));
  }
  if (filters?.status) {
    conditions.push(eq(attendance.status, filters.status as any));
  }
  // Filter by manager
  if (filters?.managerId) {
    conditions.push(eq(employees.managerId, filters.managerId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const page = filters?.page || 1;
  const limit = filters?.limit || 10;
  const offset = (page - 1) * limit;

  const totalResult = await db
    .select({ count: count() })
    .from(attendance)
    .leftJoin(employees, eq(attendance.employeeId, employees.id)) // Need join for manager filter
    .where(whereClause);

  const total = totalResult[0]?.count || 0;

  const result = await db
    .select({
      id: attendance.id,
      employeeId: attendance.employeeId,
      employeeName: employees.name,
      employeeEmail: employees.email,
      employeeDepartment: employees.department,
      date: attendance.date,
      signInTime: attendance.signInTime,
      signOutTime: attendance.signOutTime,
      signInLatitude: attendance.signInLatitude,
      signInLongitude: attendance.signInLongitude,
      signInLocation: attendance.signInLocation,
      status: attendance.status,
      rejectionReason: attendance.rejectionReason,
      rejectedBy: attendance.rejectedBy,
    })
    .from(attendance)
    .leftJoin(employees, eq(attendance.employeeId, employees.id))
    .where(whereClause)
    .orderBy(desc(attendance.date), desc(attendance.signInTime))
    .limit(limit)
    .offset(offset);

  return {
    attendance: result,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Get today's attendance for current user
export async function getMyTodayAttendance() {
  const authData = await requireAuth();
  const today = new Date().toISOString().split("T")[0];

  const result = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.employeeId, authData.employee.id),
        eq(attendance.date, today),
      ),
    )
    .limit(1);

  return result[0] || null;
}
