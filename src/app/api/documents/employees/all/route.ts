import { NextResponse } from "next/server";
import { db } from "@/db";
import { asc, ne } from "drizzle-orm";
import { getUser } from "@/actions/auth/dal";
import { employees } from "@/db/schema";
import { DrizzleQueryError } from "drizzle-orm";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        department: employees.department,
      })
      .from(employees)
      .where(ne(employees.id, user.id))
      .orderBy(asc(employees.name));

    const headers = new Headers();
    headers.set(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=300",
    );

    return NextResponse.json({ employees: results }, { status: 200, headers });
  } catch (err) {
    console.error("Error fetching all employees:", err);

    if (err instanceof DrizzleQueryError) {
      return NextResponse.json(
        { error: err.cause?.message || "Database error occurred" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Couldn't fetch employees. Please try again." },
      { status: 500 },
    );
  }
}
