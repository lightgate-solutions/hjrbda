import { getEmployeeByAuthId } from "@/actions/hr/employees";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return redirect("/unauthorized");
  }

  const role = (session.user.role ?? "").toLowerCase().trim();
  const isAdmin = role === "admin";
  const employee = await getEmployeeByAuthId(session.user.id);
  const department = (employee?.department ?? "").toLowerCase().trim();
  const isHr = role === "hr" || department === "hr";

  if (!isAdmin && !isHr) {
    return redirect("/unauthorized");
  }

  return <section>{children}</section>;
}
