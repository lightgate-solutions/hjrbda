import { requireAuth } from "@/actions/auth/dal";
import { getCurrentAttendanceSettings } from "@/actions/hr/attendance";
import AttendanceSettingsClient from "./settings-client";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Attendance Settings | HR",
  description: "Configure attendance time windows",
};

export default async function AttendanceSettingsPage() {
  const authData = await requireAuth();

  // Only allow admin or HR department users
  const isAuthorized =
    authData.role === "admin" || authData.employee.department === "hr";

  if (!isAuthorized) {
    redirect("/hr/attendance");
  }

  const settings = await getCurrentAttendanceSettings();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Attendance Settings
        </h2>
      </div>
      <AttendanceSettingsClient settings={settings} />
    </div>
  );
}
