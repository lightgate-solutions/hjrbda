import { AppSidebar } from "@/components/layouts/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import NotificationBell from "@/components/ui/notification-bell";
import { requireAuth } from "@/actions/auth/dal";
import { ConvexClientProvider } from "@/lib/convex-client-provider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/auth/login");

  const authData = await requireAuth();

  return (
    <section className="p-1">
      <ConvexClientProvider>
        <SidebarProvider>
          <AppSidebar user={session.user} employeeId={authData.employee.id} />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex w-full items-center justify-between gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <div className=" flex gap-4 justify-center items-center">
                  <ThemeToggle />
                  <NotificationBell employeeId={authData.employee.id} />
                </div>
              </div>
            </header>
            <Separator className="mr-2 data-[orientation=vertical]:h-4" />
            <div className="p-2">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </ConvexClientProvider>
    </section>
  );
}
