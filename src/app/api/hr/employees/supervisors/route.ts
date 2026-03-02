import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/actions/auth/dal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth();

    const rows = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
      })
      .from(employees)
      .where(eq(employees.isManager, true));
    return NextResponse.json({ supervisors: rows });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("Unauthorized")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    console.error("Error fetching supervisors:", error);
    return NextResponse.json(
      { error: "Failed to fetch supervisors" },
      { status: 500 },
    );
  }
}
