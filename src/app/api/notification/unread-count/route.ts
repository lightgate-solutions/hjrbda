import { db } from "@/db";
import { notifications } from "@/db/schema/notifications";
import { employees } from "@/db/schema/hr";
import { eq, and, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    const authUserId = session?.user?.id;

    if (!authUserId) {
      return Response.json({ success: false, count: 0 });
    }

    // Get employee info to get the employee ID (notifications.user_id references employees.id)
    const employeeResult = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.authId, authUserId))
      .limit(1);

    const employee = employeeResult[0];
    if (!employee) {
      return Response.json({ success: false, count: 0 });
    }

    // Use proper Drizzle ORM syntax for counting
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.user_id, employee.id),
          eq(notifications.is_read, false),
        ),
      );

    const count = Number(result[0]?.count ?? 0);

    return Response.json({ success: true, count });
  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    // Return 0 count if table doesn't exist or any other error occurs
    return Response.json({ success: false, count: 0 });
  }
}
