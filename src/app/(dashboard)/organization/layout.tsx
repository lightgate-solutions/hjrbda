import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function OrganizationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect("/unauthorized");
  }

  // Get employee data
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.authId, session.user.id))
    .limit(1);

  // Check if user is admin (role OR department)
  const isAdmin =
    session.user.role === "admin" ||
    employee?.department.toLowerCase() === "admin";

  if (!isAdmin) {
    return redirect("/unauthorized");
  }

  return <section>{children}</section>;
}
