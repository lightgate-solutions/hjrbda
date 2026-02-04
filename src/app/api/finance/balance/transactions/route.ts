import { db } from "@/db";
import { balanceTransactions, employees } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;
    const transactionType = searchParams.get("type") || "";

    let where: ReturnType<typeof eq> | undefined;
    if (transactionType) {
      where = eq(balanceTransactions.transactionType, transactionType);
    }

    const rows = await db
      .select({
        id: balanceTransactions.id,
        amount: balanceTransactions.amount,
        transactionType: balanceTransactions.transactionType,
        description: balanceTransactions.description,
        balanceBefore: balanceTransactions.balanceBefore,
        balanceAfter: balanceTransactions.balanceAfter,
        createdAt: balanceTransactions.createdAt,
        userId: balanceTransactions.userId,
        userName: employees.name,
        userEmail: employees.email,
      })
      .from(balanceTransactions)
      .leftJoin(employees, eq(employees.id, balanceTransactions.userId))
      .where(where)
      .orderBy(desc(balanceTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(balanceTransactions)
      .where(where);
    const total = totalResult[0].count;

    return NextResponse.json({
      transactions: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching balance transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance transactions" },
      { status: 500 },
    );
  }
}
