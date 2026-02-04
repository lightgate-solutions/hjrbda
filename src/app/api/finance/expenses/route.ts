/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

import { db } from "@/db";
import {
  companyExpenses,
  companyBalance,
  balanceTransactions,
  employees,
} from "@/db/schema";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const q = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDirection =
      searchParams.get("sortDirection") === "asc" ? "asc" : "desc";

    let where: ReturnType<typeof or> | ReturnType<typeof eq> | undefined;
    if (q) {
      where = or(
        ilike(companyExpenses.title, `%${q}%`),
        ilike(companyExpenses.description, `%${q}%`),
        ilike(companyExpenses.category, `%${q}%`),
      );
    }
    if (category) {
      where = where
        ? and(where, eq(companyExpenses.category, category))
        : eq(companyExpenses.category, category);
    }

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(companyExpenses)
      .where(where);
    const total = totalResult[0].count;

    // Map sortBy to actual column names
    const columnMap: Record<string, any> = {
      id: companyExpenses.id,
      title: companyExpenses.title,
      description: companyExpenses.description,
      amount: companyExpenses.amount,
      category: companyExpenses.category,
      expenseDate: companyExpenses.expenseDate,
      createdAt: companyExpenses.createdAt,
      updatedAt: companyExpenses.updatedAt,
    };

    const orderColumn = columnMap[sortBy] || companyExpenses.createdAt;
    const order =
      sortDirection === "asc" ? asc(orderColumn) : desc(orderColumn);

    const rows = await db
      .select()
      .from(companyExpenses)
      .where(where)
      .orderBy(order)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      expenses: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching company expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch company expenses" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user session for transaction tracking
    const h = Object.fromEntries(request.headers);
    const session = await auth.api.getSession({ headers: h });
    const authUserId = session?.user?.id;

    // Get employee ID if user is authenticated (optional for expenses)
    let employeeId: number | null = null;
    if (authUserId) {
      const [employee] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.authId, authUserId))
        .limit(1);
      employeeId = employee?.id ?? null;
    }

    const body = await request.json();
    const { title, description, amount, category, expenseDate } = body ?? {};

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "amount is required and must be greater than 0" },
        { status: 400 },
      );
    }

    // Start a transaction to insert expense and update balance
    const expenseAmount = Number(amount);

    // Insert the expense
    const [created] = await db
      .insert(companyExpenses)
      .values({
        title,
        description,
        amount: expenseAmount.toString(),
        category: category || null,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      })
      .returning();

    // Update company balance (subtract expense)
    // Get current balance or create if doesn't exist
    const [balanceRecord] = await db.select().from(companyBalance).limit(1);

    const balanceBefore = balanceRecord ? Number(balanceRecord.balance) : 0;
    const newBalance = balanceBefore - expenseAmount;

    if (balanceRecord) {
      await db
        .update(companyBalance)
        .set({
          balance: newBalance.toString(),
          updatedAt: new Date(),
        })
        .where(eq(companyBalance.id, balanceRecord.id));
    } else {
      // Create initial balance record if it doesn't exist (assumes starting from 0)
      await db.insert(companyBalance).values({
        balance: newBalance.toString(),
        currency: "NGN",
      });
    }

    // Record transaction if user is authenticated
    if (employeeId) {
      await db.insert(balanceTransactions).values({
        userId: employeeId,
        amount: expenseAmount.toString(),
        transactionType: "expense",
        description: `Expense: ${title}`,
        balanceBefore: balanceBefore.toString(),
        balanceAfter: newBalance.toString(),
      });
    }

    return NextResponse.json({ expense: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating company expense:", error);
    return NextResponse.json(
      { error: "Failed to create company expense" },
      { status: 500 },
    );
  }
}
