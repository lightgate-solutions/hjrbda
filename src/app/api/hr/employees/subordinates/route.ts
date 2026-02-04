import { db } from "@/db";
import { employees } from "@/db/schema";
import { and, eq, ilike, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("employeeId");
    const q = searchParams.get("q") || "";
    if (!id) {
      return NextResponse.json(
        { error: "Employee auth ID is required" },
        { status: 400 },
      );
    }
    const [res] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, Number(id)))
      .limit(1);
    const employeeId = res.id;
    console.log(employeeId);
    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId is required" },
        { status: 400 },
      );
    }
    let where: ReturnType<typeof and> | undefined = eq(
      employees.managerId,
      employeeId,
    );
    if (q) {
      where = where
        ? and(
            where,
            or(
              ilike(employees.name, `%${q}%`),
              ilike(employees.email, `%${q}%`),
            ),
          )
        : or(ilike(employees.name, `%${q}%`), ilike(employees.email, `%${q}%`));
    }
    const rows = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        department: employees.department,
      })
      .from(employees)
      .where(where)
      .limit(10);
    return NextResponse.json({ subordinates: rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch subordinates" },
      { status: 500 },
    );
  }
}
