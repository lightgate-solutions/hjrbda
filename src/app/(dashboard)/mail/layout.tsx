/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, ChevronRight, ChevronLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MailSearch } from "@/components/mail/mail-search";
import { InboxWrapper } from "@/components/mail/inbox-wrapper";
import { getEmailById, getEmailStats } from "@/actions/mail/email";
import { getAllEmployees } from "@/actions/hr/employees";
import { MailSidebar } from "@/components/mail/mail-sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Folder = "inbox" | "sent" | "archive" | "trash";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
}

interface Stats {
  unreadCount: number;
  inboxCount: number;
  archivedCount: number;
  sentCount: number;
  trashCount: number;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    unreadCount: 0,
    inboxCount: 0,
    archivedCount: 0,
    sentCount: 0,
    trashCount: 0,
  });
  const [selectedEmail, setSelectedEmail] = useState<{
    id: number;
    subject: string;
    body: string;
    senderName: string;
    senderId: number;
    senderEmail: string;
    createdAt: Date;
  } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const _currentFolder: Folder = useMemo(() => {
    const path = pathname || "";
    if (path.includes("/mail/sent")) return "sent";
    if (path.includes("/mail/archive")) return "archive";
    if (path.includes("/mail/trash")) return "trash";
    return "inbox";
  }, [pathname]);

  const emailId = searchParams.get("id");

  // Fetch sidebar stats and users once and refresh when route changes
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [statsRes, usersRes] = await Promise.all([
        getEmailStats(),
        getAllEmployees(),
      ]);

      if (!mounted) return;

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      setUsers(usersRes);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [pathname]);

  // Fetch selected email for global reply/forward dialog support
  useEffect(() => {
    let mounted = true;

    const loadSelected = async () => {
      if (!emailId) {
        if (mounted) setSelectedEmail(null);
        return;
      }
      const res = await getEmailById(Number(emailId));
      if (!mounted) return;

      if (res.success && res.data) {
        setSelectedEmail({
          id: res.data.id,
          subject: res.data.subject,
          body: res.data.body,
          senderId: res.data.senderId,
          senderName: res.data.senderName,
          senderEmail: res.data.senderEmail,
          createdAt: res.data.createdAt,
        });
      } else {
        setSelectedEmail(null);
      }
    };

    loadSelected();
    return () => {
      mounted = false;
    };
  }, [emailId]);

  const triggerCompose = () => {
    document.querySelector<HTMLElement>("[data-compose-trigger]")?.click();
  };

  const _triggerReply = () => {
    document.querySelector<HTMLElement>("[data-reply-trigger]")?.click();
  };

  const _triggerForward = () => {
    document.querySelector<HTMLElement>("[data-forward-trigger]")?.click();
  };

  const handleRefresh = () => {
    router.refresh();
  };

  const handleSearchResultClick = (id: string, folder: string) => {
    if (folder === "inbox") {
      router.push(`/mail/inbox?id=${id}`);
    } else {
      router.push(`/mail/${folder}?id=${id}`);
    }
  };

  return (
    <InboxWrapper users={users} selectedEmail={selectedEmail}>
      <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden rounded-xl border bg-background shadow-sm">
        {/* Desktop Sidebar */}
        <div
          className={cn(
            "hidden md:block border-r bg-muted/10 transition-all duration-300 ease-in-out relative",
            isCollapsed ? "w-[52px]" : "w-64",
          )}
        >
          <MailSidebar
            stats={stats}
            onCompose={triggerCompose}
            isCollapsed={isCollapsed}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-3 top-6 h-6 w-6 rounded-full border bg-background shadow-md z-10 hover:bg-accent"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Mobile Sidebar */}
        <div className="md:hidden absolute top-4 left-4 z-50">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <MailSidebar
                stats={stats}
                onCompose={triggerCompose}
                isCollapsed={false}
              />
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between border-b px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2 ml-10 md:ml-0">
              <h1 className="text-xl font-semibold">Mail</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-full max-w-sm">
                <MailSearch onResultClick={handleSearchResultClick} />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative">{children}</div>
        </div>
      </div>
    </InboxWrapper>
  );
}
