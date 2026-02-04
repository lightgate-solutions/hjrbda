import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema/hr";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    const authUserId = session?.user?.id;
    const role = session?.user?.role;

    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Normalize role check
    const normalizedRole = role?.toLowerCase().trim() || "";
    const isAdmin = normalizedRole === "admin";

    // Only admin can see user distribution
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Get user distribution by role
    // Group by role and count users
    const roleDistribution = await db
      .select({
        role: employees.role,
        count: sql<number>`count(*)::int`,
      })
      .from(employees)
      .groupBy(employees.role);

    // Map roles to display names and colors
    const roleMap: Record<
      string,
      { name: string; colorLight: string; colorDark: string }
    > = {
      hr: { name: "HR", colorLight: "#3b82f6", colorDark: "#60a5fa" },
      "human resources": {
        name: "HR",
        colorLight: "#3b82f6",
        colorDark: "#60a5fa",
      },
      finance: { name: "Finance", colorLight: "#8b5cf6", colorDark: "#a78bfa" },
      accounting: {
        name: "Finance",
        colorLight: "#8b5cf6",
        colorDark: "#a78bfa",
      },
      accountant: {
        name: "Finance",
        colorLight: "#8b5cf6",
        colorDark: "#a78bfa",
      },
      management: {
        name: "Management",
        colorLight: "#10b981",
        colorDark: "#34d399",
      },
      manager: {
        name: "Management",
        colorLight: "#10b981",
        colorDark: "#34d399",
      },
      staff: { name: "Staff", colorLight: "#f59e0b", colorDark: "#fbbf24" },
      employee: { name: "Staff", colorLight: "#f59e0b", colorDark: "#fbbf24" },
      admin: { name: "Admin", colorLight: "#ef4444", colorDark: "#f87171" },
    };

    // Format data for chart
    const distributionData = roleDistribution.map((item) => {
      const roleKey = item.role?.toLowerCase().trim() || "staff";
      const roleInfo = roleMap[roleKey] || {
        name: item.role || "Other",
        colorLight: "#94a3b8",
        colorDark: "#cbd5e1",
      };

      return {
        name: roleInfo.name,
        value: Number(item.count || 0),
        colorLight: roleInfo.colorLight,
        colorDark: roleInfo.colorDark,
      };
    });

    // Sort by value descending
    distributionData.sort((a, b) => b.value - a.value);

    return NextResponse.json({ distribution: distributionData });
  } catch (error) {
    console.error("Error fetching user distribution:", error);
    return NextResponse.json(
      { error: "Failed to fetch user distribution", distribution: [] },
      { status: 500 },
    );
  }
}
