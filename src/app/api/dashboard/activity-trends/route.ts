import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
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

    // Only admin can see activity trends - normalize role like dashboard does
    const normalizedRole = role?.toLowerCase().trim() || "";
    if (normalizedRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Aggregate activities from multiple sources
    const [docCreated, docUpdated, projCreated, projUpdated, payments] =
      await Promise.all([
        // Documents created
        db.execute(sql`
        SELECT DATE(created_at)::text as activity_date, COUNT(*)::int as count
        FROM document
        WHERE created_at >= ${thirtyDaysAgo}
          AND status = 'active'
        GROUP BY DATE(created_at)
      `),
        // Documents updated (exclude same-day as created)
        db.execute(sql`
        SELECT DATE(updated_at)::text as activity_date, COUNT(*)::int as count
        FROM document
        WHERE updated_at >= ${thirtyDaysAgo}
          AND DATE(updated_at) != DATE(created_at)
          AND status = 'active'
        GROUP BY DATE(updated_at)
      `),
        // Projects created
        db.execute(sql`
        SELECT DATE(created_at)::text as activity_date, COUNT(*)::int as count
        FROM projects
        WHERE created_at >= ${thirtyDaysAgo}
        GROUP BY DATE(created_at)
      `),
        // Projects updated (exclude same-day as created)
        db.execute(sql`
        SELECT DATE(updated_at)::text as activity_date, COUNT(*)::int as count
        FROM projects
        WHERE updated_at >= ${thirtyDaysAgo}
          AND DATE(updated_at) != DATE(created_at)
        GROUP BY DATE(updated_at)
      `),
        // Payments
        db.execute(sql`
        SELECT DATE(created_at)::text as activity_date, COUNT(*)::int as count
        FROM payments
        WHERE created_at >= ${thirtyDaysAgo}
        GROUP BY DATE(created_at)
      `),
      ]);

    // Combine all activities into a map by date
    const activityMap = new Map<string, number>();

    const allActivities = [
      ...(Array.isArray(docCreated) ? docCreated : docCreated.rows || []),
      ...(Array.isArray(docUpdated) ? docUpdated : docUpdated.rows || []),
      ...(Array.isArray(projCreated) ? projCreated : projCreated.rows || []),
      ...(Array.isArray(projUpdated) ? projUpdated : projUpdated.rows || []),
      ...(Array.isArray(payments) ? payments : payments.rows || []),
    ];

    for (const row of allActivities) {
      const date = row?.activity_date as string;
      const count = Number(row?.count) || 0;
      if (!date) continue;
      // Normalize date format to YYYY-MM-DD
      const normalizedDate = date.split("T")[0]; // Handle both date-only and datetime formats
      activityMap.set(
        normalizedDate,
        (activityMap.get(normalizedDate) || 0) + count,
      );
    }

    // Fill in missing dates with 0 activity
    const filledTrends: Array<{ date: string; activity: number }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    for (let i = 29; i >= 0; i--) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateKey = checkDate.toISOString().split("T")[0]; // YYYY-MM-DD format
      const dateStr = checkDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      // Find activity for this date - SQL DATE() returns YYYY-MM-DD format
      const activity = activityMap.get(dateKey) || 0;

      filledTrends.push({
        date: dateStr,
        activity,
      });
    }

    return NextResponse.json({ trends: filledTrends });
  } catch (error) {
    console.error("Error fetching activity trends:", error);
    // Return empty array on error
    return NextResponse.json({ trends: [] }, { status: 200 });
  }
}
