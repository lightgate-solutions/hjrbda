/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmailDetail } from "@/components/mail/email-detail";
import { ComposeEmail } from "@/components/mail/compose-email";
import { MailSearch } from "@/components/mail/mail-search";
import { getSentEmails, getEmailById } from "@/actions/mail/email";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MailCheck } from "lucide-react";
import { getAllEmployees } from "@/actions/hr/employees";
import { CardContent } from "@/components/ui/card";

interface SentEmail {
  id: number;
  subject: string;
  body: string;
  createdAt: Date;
  type: string;
  hasBeenOpened: boolean;
  recipients: Array<{
    id: number;
    name: string;
    email: string;
    isRead: boolean;
    readAt?: Date | null;
  }>;
}

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
}

export default function SentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailId = searchParams.get("id");

  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [users, setUsers] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadEmails = async () => {
    setIsLoading(true);
    const result = await getSentEmails(page, 20);

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
      router.push("/mail/sent");
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
    router.push(`/mail/sent?id=${id}`);
  };

  const handleBack = () => {
    router.push("/mail/sent");
  };

  const handleRefresh = () => {
    loadEmails();
    if (emailId) {
      loadEmailDetail(Number(emailId));
    }
  };

  const handleSearchResultClick = (id: string, folder: string) => {
    if (folder === "sent") {
      router.push(`/mail/sent?id=${id}`);
    } else {
      router.push(`/mail/${folder}?id=${id}`);
    }
  };

  const _getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
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
            folder="sent"
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
            <h1 className="text-2xl font-bold">Sent</h1>
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
              <Pencil className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No sent emails</p>
              <p className="text-sm">Send your first email to get started</p>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {emails.map((email) => {
                  const readCount = email.recipients.filter(
                    (r) => r.isRead,
                  ).length;
                  const totalRecipients = email.recipients.length;

                  return (
                    <CardContent
                      key={email.id}
                      onClick={() => handleEmailClick(email.id)}
                      className={cn(
                        "flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50",
                        Number(emailId) === email.id && "bg-muted",
                      )}
                    >
                      <div className="flex-shrink-0 mt-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-xs bg-primary/10">
                            <Pencil className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">To:</span>
                            {email.recipients.slice(0, 2).map((recipient) => (
                              <Badge
                                key={recipient.id}
                                variant="secondary"
                                className="text-xs"
                              >
                                {recipient.name}
                              </Badge>
                            ))}
                            {email.recipients.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{email.recipients.length - 2} more
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {formatDistanceToNow(new Date(email.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold truncate">
                            {email.subject}
                          </h3>
                          {email.type !== "sent" && (
                            <Badge
                              variant="secondary"
                              className="text-xs flex-shrink-0 h-5"
                            >
                              {email.type}
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {truncateText(email.body, 120)}
                        </p>

                        <div className="flex items-center gap-2">
                          {email.hasBeenOpened ? (
                            <>
                              <MailCheck className="h-4 w-4 text-green-600" />
                              <span className="text-xs text-muted-foreground">
                                Read by {readCount} of {totalRecipients}{" "}
                                recipient{totalRecipients !== 1 ? "s" : ""}
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="h-2 w-2 bg-orange-500 rounded-full" />
                              <span className="text-xs text-muted-foreground">
                                Not opened yet
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  );
                })}
              </div>

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
