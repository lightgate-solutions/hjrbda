import { db } from "@/db";
import { companyBalance, balanceTransactions, employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import type { InferSelectModel } from "drizzle-orm";

export async function GET() {
  try {
    const [balance] = await db.select().from(companyBalance).limit(1);

    if (!balance) {
      // Return default balance if no record exists
      return NextResponse.json({
        balance: {
          id: 0,
          balance: "0",
          currency: "NGN",
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({ balance });
  } catch (error) {
    console.error("Error fetching company balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch company balance" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get user session
    const h = Object.fromEntries(request.headers);
    const session = await auth.api.getSession({ headers: h });
    const authUserId = session?.user?.id;

    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get employee ID from auth user ID
    const [employee] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.authId, authUserId))
      .limit(1);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const {
      balance: newBalance,
      currency,
      addAmount,
      description,
    } = body ?? {};

    // Get or create balance record
    const [existing] = await db.select().from(companyBalance).limit(1);

    const balanceBefore = existing ? Number(existing.balance) : 0;
    let finalBalance: string;
    let transactionType = "adjustment";
    let transactionAmount = "0";

    if (addAmount !== undefined) {
      // If addAmount is provided, add it to existing balance
      transactionType = "top-up";
      transactionAmount = Number(addAmount).toString();
      finalBalance = (balanceBefore + Number(addAmount)).toString();
    } else if (newBalance !== undefined) {
      // If newBalance is provided, set it directly
      transactionAmount = (Number(newBalance) - balanceBefore).toString();
      finalBalance = Number(newBalance).toString();
    } else {
      return NextResponse.json(
        { error: "balance or addAmount is required" },
        { status: 400 },
      );
    }

    let updated: InferSelectModel<typeof companyBalance> | undefined;
    if (existing) {
      const result = await db
        .update(companyBalance)
        .set({
          balance: finalBalance,
          currency: currency || existing.currency,
          updatedAt: new Date(),
        })
        .where(eq(companyBalance.id, existing.id))
        .returning();
      updated = result[0];
    } else {
      const result = await db
        .insert(companyBalance)
        .values({
          balance: finalBalance,
          currency: currency || "NGN",
        })
        .returning();
      updated = result[0];
    }

    // Record transaction only if there's a change in balance
    if (Number(transactionAmount) !== 0) {
      await db.insert(balanceTransactions).values({
        userId: employee.id,
        amount: transactionAmount,
        transactionType,
        description:
          description ||
          (transactionType === "top-up"
            ? `Top-up: ₦${Number(transactionAmount).toLocaleString()}`
            : `Balance adjustment: ₦${Number(transactionAmount).toLocaleString()}`),
        balanceBefore: balanceBefore.toString(),
        balanceAfter: finalBalance,
      });
    }

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update balance" },
        { status: 500 },
      );
    }
    return NextResponse.json({ balance: updated });
  } catch (error) {
    console.error("Error updating company balance:", error);
    return NextResponse.json(
      { error: "Failed to update company balance" },
      { status: 500 },
    );
  }
}
