/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmailList } from "@/components/mail/email-list";
import { EmailDetail } from "@/components/mail/email-detail";
import { ComposeEmail } from "@/components/mail/compose-email";
import { MailSearch } from "@/components/mail/mail-search";
import { getTrashEmails, getEmailById } from "@/actions/mail/email";
import { getAllEmployees } from "@/actions/hr/employees";

interface Email {
  id: number;
  subject: string;
  body: string;
  createdAt: Date;
  type: string;
  senderId: number;
  senderName: string;
  senderEmail: string;
  isRead?: boolean;
  deletedAt?: Date | null;
}

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
}

export default function TrashPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailId = searchParams.get("id");

  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [users, setUsers] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadEmails = async () => {
    setIsLoading(true);
    const result = await getTrashEmails(page, 20);

    if (result.success) {
      setEmails(result.data?.emails ?? []);
      setTotalPages(result.data?.pagination.totalPages ?? 1);
    } else {
      toast.error(result.error || "Failed to load emails");
    }
    setIsLoading(false);
  };

  const loadUsers = async () => {
    const result = await getAllEmployees();
    setUsers(result);
  };

  const loadEmailDetail = async (id: number) => {
    setIsLoadingDetail(true);
    const result = await getEmailById(id);

    if (result.success) {
      setSelectedEmail(result.data);
    } else {
      toast.error(result.error || "Failed to load email");
      router.push("/mail/trash");
    }
    setIsLoadingDetail(false);
  };

  useEffect(() => {
    loadEmails();
    loadUsers();
  }, [page]);

  useEffect(() => {
    if (emailId) {
      loadEmailDetail(Number(emailId));
    } else {
      setSelectedEmail(null);
    }
  }, [emailId]);

  const handleEmailClick = (id: number) => {
    router.push(`/mail/trash?id=${id}`);
  };

  const handleBack = () => {
    router.push("/mail/trash");
  };

  const handleRefresh = () => {
    loadEmails();
    if (emailId) {
      loadEmailDetail(Number(emailId));
    }
  };

  const handleSearchResultClick = (id: string, folder: string) => {
    if (folder === "trash") {
      router.push(`/mail/trash?id=${id}`);
    } else {
      router.push(`/mail/${folder}?id=${id}`);
    }
  };

  if (selectedEmail) {
    return (
      <div className="h-full">
        {isLoadingDetail ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <EmailDetail
            email={selectedEmail}
            onBack={handleBack}
            onUpdate={handleRefresh}
            folder="trash"
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold">Trash</h1>
            <p className="text-sm text-muted-foreground">
              {emails.length} email{emails.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button onClick={() => setShowCompose(true)} className="gap-2">
              <Pencil className="h-4 w-4" />
              Compose
            </Button>
          </div>
        </div>

        <div className="p-4 border-b">
          <MailSearch onResultClick={handleSearchResultClick} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Trash2 className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Trash is empty</p>
              <p className="text-sm">Deleted emails will appear here</p>
            </div>
          ) : (
            <>
              <EmailList
                emails={emails}
                onEmailClick={handleEmailClick}
                selectedEmailId={emailId || undefined}
              />

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || isLoading}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ComposeEmail
        open={showCompose}
        onOpenChange={setShowCompose}
        users={users}
        onSuccess={handleRefresh}
      />
    </>
  );
}
