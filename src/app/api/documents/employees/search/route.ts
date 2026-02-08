import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getUser } from "@/actions/auth/dal";
import { employees } from "@/db/schema";
import { DrizzleQueryError } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") || "";
  const limit = Number(searchParams.get("limit") || "8");

  try {
    const q = query.trim();
    if (!q) {
      return NextResponse.json({ employees: [] }, { status: 200 });
    }

    const results = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        department: employees.department,
      })
      .from(employees)
      .where(
        sql`(${employees.name} ILIKE ${`%${q}%`} OR ${employees.email} ILIKE ${`%${q}%`}) AND ${employees.id} <> ${user.id}`,
      )
      .limit(limit);

    const headers = new Headers();
    headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60",
    );

    return NextResponse.json({ employees: results }, { status: 200, headers });
  } catch (err) {
    console.error("Error searching employees:", err);

    if (err instanceof DrizzleQueryError) {
      return NextResponse.json(
        { error: err.cause?.message || "Database error occurred" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Couldn't search employees. Please try again." },
      { status: 500 },
    );
  }
}
