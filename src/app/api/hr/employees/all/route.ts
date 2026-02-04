import { db } from "@/db";
import { employees } from "@/db/schema";
import { ilike } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q") || "";
    const limit = Number(searchParams.get("limit") || "50");

    const where = q ? ilike(employees.name, `%${q}%`) : undefined;

    const rows = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
      })
      .from(employees)
      .where(where)
      .limit(limit);

    return NextResponse.json({ employees: rows });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 },
    );
  }
}
