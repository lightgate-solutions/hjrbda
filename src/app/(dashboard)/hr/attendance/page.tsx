import { Suspense } from "react";
import { requireAuth } from "@/actions/auth/dal";
import {
  getMyTodayAttendance,
  getAttendanceRecords,
  getCurrentAttendanceSettings,
} from "@/actions/hr/attendance";
import AttendanceClient from "./attendance-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Attendance | HR",
  description: "Manage your attendance",
};

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const authData = await requireAuth();
  const myAttendance = await getMyTodayAttendance();
  const settings = await getCurrentAttendanceSettings();

  // Check if user is HR or Manager
  let isManagerOrHR = false;
  const isHROrAdmin =
    authData.role === "admin" || authData.employee.department === "hr";

  if (isHROrAdmin) {
    isManagerOrHR = true;
  } else {
    // Check if isManager flag is true
    if (authData.employee.isManager) {
      isManagerOrHR = true;
    }
  }

  let allAttendance = null;
  let filters: { page: number; limit: number; managerId?: number } | undefined;

  if (isManagerOrHR) {
    const page =
      typeof searchParams.page === "string" ? Number(searchParams.page) : 1;
    const limit =
      typeof searchParams.limit === "string" ? Number(searchParams.limit) : 10;

    // Pass search params to filter if needed
    filters = {
      page,
      limit,
    };

    // If manager but not HR/Admin, restrict to direct reports
    if (
      isManagerOrHR &&
      authData.role !== "admin" &&
      authData.employee.department !== "HR" &&
      authData.employee.isManager
    ) {
      filters.managerId = authData.employee.id;
    }

    allAttendance = await getAttendanceRecords(filters);
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <AttendanceClient
          myAttendance={myAttendance}
          allAttendance={allAttendance}
          isManagerOrHR={isManagerOrHR}
          currentEmployeeId={authData.employee.id}
          managerIdFilter={filters?.managerId}
          settings={settings}
          isHROrAdmin={isHROrAdmin}
        />
      </Suspense>
    </div>
  );
}
