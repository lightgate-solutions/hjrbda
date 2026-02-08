import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user.id) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const [user] = await db
    .select({
      id: employees.id,
      name: employees.name,
      staffNumber: employees.staffNumber,
      role: employees.role,
      email: employees.email,
      phone: employees.phone,
      department: employees.department,
      managerId: employees.managerId,
      isManager: employees.isManager,
    })
    .from(employees)
    .where(eq(employees.authId, session.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ user: null }, { status: 404 });
  }

  return NextResponse.json({ user });
}
