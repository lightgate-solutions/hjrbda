import { requireAdmin } from "@/actions/auth/dal";
import { db } from "@/db";
import { employees } from "@/db/schema/hr";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Only admin-level users can see user distribution (role=admin OR department=admin)
    await requireAdmin();

    // Get user distribution by department (the actual RBAC dimension)
    const deptDistribution = await db
      .select({
        department: employees.department,
        count: sql<number>`count(*)::int`,
      })
      .from(employees)
      .groupBy(employees.department);

    // Map departments to display names and colors
    const deptMap: Record<
      string,
      { name: string; colorLight: string; colorDark: string }
    > = {
      admin: { name: "Admin", colorLight: "#ef4444", colorDark: "#f87171" },
      hr: { name: "HR", colorLight: "#3b82f6", colorDark: "#60a5fa" },
      finance: { name: "Finance", colorLight: "#8b5cf6", colorDark: "#a78bfa" },
      operations: {
        name: "Operations",
        colorLight: "#10b981",
        colorDark: "#34d399",
      },
    };

    // Format data for chart
    const distributionData = deptDistribution.map((item) => {
      const deptKey = item.department?.toLowerCase().trim() || "other";
      const deptInfo = deptMap[deptKey] || {
        name: item.department || "Other",
        colorLight: "#f59e0b",
        colorDark: "#fbbf24",
      };

      return {
        name: deptInfo.name,
        value: Number(item.count || 0),
        colorLight: deptInfo.colorLight,
        colorDark: deptInfo.colorDark,
      };
    });

    // Sort by value descending
    distributionData.sort((a, b) => b.value - a.value);

    return NextResponse.json({ distribution: distributionData });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("Unauthorized")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message.startsWith("Forbidden")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error fetching user distribution:", error);
    return NextResponse.json(
      { error: "Failed to fetch user distribution", distribution: [] },
      { status: 500 },
    );
  }
}
