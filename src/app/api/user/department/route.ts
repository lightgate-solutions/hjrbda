import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select({
        id: employees.id,
        role: employees.role,
        department: employees.department,
        isManager: employees.isManager,
      })
      .from(employees)
      .where(eq(employees.authId, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      department: user.department || "general",
      role: user.role,
      isManager: user.isManager,
    });
  } catch (error) {
    console.error("Error fetching user department:", error);
    return NextResponse.json(
      { error: "Failed to fetch user department" },
      { status: 500 },
    );
  }
}
