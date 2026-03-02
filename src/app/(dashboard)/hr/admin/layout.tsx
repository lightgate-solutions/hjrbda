import { requireAdmin } from "@/actions/auth/dal";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  try {
    await requireAdmin();
  } catch {
    return redirect("/unauthorized");
  }

  return <section>{children}</section>;
}
