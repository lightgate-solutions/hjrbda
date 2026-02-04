import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { companyExpenses } from "@/db/schema/finance";
import { sql, isNotNull } from "drizzle-orm";
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

    // Only admin can see budget breakdown - normalize role like dashboard does
    const normalizedRole = role?.toLowerCase().trim() || "";
    if (normalizedRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Group expenses by category (department) and sum amounts
    const budgetData = await db
      .select({
        department: companyExpenses.category,
        budget: sql<number>`COALESCE(SUM(CAST(${companyExpenses.amount} AS NUMERIC)), 0)`,
      })
      .from(companyExpenses)
      .where(isNotNull(companyExpenses.category))
      .groupBy(companyExpenses.category)
      .orderBy(
        sql`COALESCE(SUM(CAST(${companyExpenses.amount} AS NUMERIC)), 0) DESC`,
      );

    const formattedData = budgetData.map((item) => ({
      department: item.department || "Uncategorized",
      budget: Number(item.budget || 0),
    }));

    // Return empty array if no data, but still return successful response
    return NextResponse.json({ breakdown: formattedData });
  } catch (error) {
    console.error("Error fetching budget breakdown:", error);
    // Return empty array on error instead of failing
    return NextResponse.json(
      {
        breakdown: [],
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 },
    );
  }
}
