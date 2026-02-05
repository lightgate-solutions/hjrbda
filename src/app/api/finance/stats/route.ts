import { db } from "@/db";
import { companyExpenses, balanceTransactions } from "@/db/schema";
import { sql, and, gte, lte, type SQL } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let expenseWhere: SQL | undefined;
    let chartWhere: SQL | undefined;

    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      // Adjust toDate to end of day
      toDate.setHours(23, 59, 59, 999);

      expenseWhere = and(
        gte(companyExpenses.expenseDate, fromDate),
        lte(companyExpenses.expenseDate, toDate),
      );

      chartWhere = and(
        gte(balanceTransactions.createdAt, fromDate),
        lte(balanceTransactions.createdAt, toDate),
      );
    }

    // Total Expenses (Filtered)
    const [expensesResult] = await db
      .select({ total: sql<string>`sum(${companyExpenses.amount})` })
      .from(companyExpenses)
      .where(expenseWhere);

    // Chart Data - Aggregate expenses and income by day
    // We'll use balanceTransactions for this as it tracks both
    const chartData = await db
      .select({
        date: sql<string>`DATE(${balanceTransactions.createdAt})`,
        type: balanceTransactions.transactionType,
        amount: sql<string>`sum(${balanceTransactions.amount})`,
      })
      .from(balanceTransactions)
      .where(chartWhere)
      .groupBy(
        sql`DATE(${balanceTransactions.createdAt})`,
        balanceTransactions.transactionType,
      )
      .orderBy(sql`DATE(${balanceTransactions.createdAt})`);

    // Process chart data into format for Recharts
    // { date: 'YYYY-MM-DD', income: 100, expense: 50 }
    const processedChartData: Record<
      string,
      { date: string; income: number; expense: number }
    > = {};

    for (const record of chartData) {
      const date = record.date;
      if (!processedChartData[date]) {
        processedChartData[date] = { date, income: 0, expense: 0 };
      }

      const amount = Number(record.amount);
      if (record.type === "top-up") {
        processedChartData[date].income += amount;
      } else if (record.type === "expense") {
        processedChartData[date].expense += amount;
      }
    }

    const chartDataArray = Object.values(processedChartData).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return NextResponse.json({
      totalExpenses: expensesResult?.total || "0",
      chartData: chartDataArray,
    });
  } catch (error) {
    console.error("Error fetching finance stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch finance stats" },
      { status: 500 },
    );
  }
}
