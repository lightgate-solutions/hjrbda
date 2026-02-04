"use client";

import { formatDistanceToNow } from "date-fns";
import { Mail, MailOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LoadMoreButton } from "./load-more-button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Email {
  id: number;
  subject: string;
  body: string;
  createdAt: Date;
  type: string;
  senderId?: number;
  senderName?: string;
  senderEmail?: string;
  isRead?: boolean;
  readAt?: Date | null;
  hasBeenOpened?: boolean;
  recipients?: Array<{
    id: number;
    name: string;
    email: string;
    isRead: boolean;
    readAt?: Date | null;
  }>;
}

interface EmailListSidebarProps {
  emails: Email[];
  folder: "inbox" | "sent" | "archive" | "trash";
  onLoadMore?: () => void;
  loading?: boolean;
  hasMore?: boolean;
}

export function EmailListSidebar({
  emails,
  folder,
  onLoadMore,
  loading = false,
  hasMore = false,
}: EmailListSidebarProps) {
  const searchParams = useSearchParams();
  const selectedId = Number(searchParams.get("id"));

  const getInitials = (name: string) => {
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

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <Mail className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm font-medium">No emails</p>
        <p className="text-xs">Your {folder} is empty</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {emails.map((email) => {
        const isSelected = selectedId === email.id;

        // For sent emails
        if (folder === "sent" && email.recipients) {
          const readCount = email.recipients.filter((r) => r.isRead).length;
          const totalRecipients = email.recipients.length;

          return (
            <Link
              key={email.id}
              href={`/mail/${folder}?id=${email.id}`}
              className={cn(
                "flex items-start gap-3 p-3 transition-colors hover:bg-muted/50 ",
                isSelected && "bg-muted",
              )}
            >
              <div className="flex-shrink-0 mt-1">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10">
                    <Mail className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1 flex-wrap min-w-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      To:
                    </span>
                    <span className="text-xs font-medium truncate">
                      {email.recipients
                        .slice(0, 2)
                        .map((r) => r.name)
                        .join(", ")}
                      {email.recipients.length > 2 &&
                        ` +${email.recipients.length - 2}`}
                    </span>
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
                    <Badge variant="secondary" className="text-xs h-4">
                      {email.type}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                  {truncateText(email.body, 80)}
                </p>

                <div className="flex items-center gap-1.5">
                  {email.hasBeenOpened ? (
                    <>
                      <MailOpen className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-muted-foreground">
                        Read by {readCount}/{totalRecipients}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-1.5 w-1.5 bg-orange-500 rounded-full" />
                      <span className="text-xs text-muted-foreground">
                        Not opened
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        }

        return (
          <Link
            key={email.id}
            href={`/mail/${folder}?id=${email.id}`}
            className={cn(
              "flex items-start gap-3 p-3 transition-colors hover:bg-muted/50 ",
              isSelected && "bg-muted",
              !email.isRead && "bg-blue-50/50 dark:bg-blue-950/20",
            )}
          >
            <div className="flex-shrink-0 mt-1">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {getInitials(email.senderName || "Unknown")}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={cn(
                      "text-sm font-medium truncate",
                      !email.isRead && "font-semibold",
                    )}
                  >
                    {email.senderName}
                  </span>
                  {!email.isRead && (
                    <div className="flex-shrink-0 h-1.5 w-1.5 bg-blue-600 rounded-full" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {formatDistanceToNow(new Date(email.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <h3
                  className={cn(
                    "text-sm truncate",
                    !email.isRead ? "font-semibold" : "font-medium",
                  )}
                >
                  {email.subject}
                </h3>
                {email.type !== "sent" && (
                  <Badge
                    variant="secondary"
                    className="text-xs h-4 flex-shrink-0"
                  >
                    {email.type}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">
                {truncateText(email.body, 100)}
              </p>
            </div>

            <div className="flex-shrink-0 mt-1">
              {email.isRead ? (
                <MailOpen className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Mail className="h-3.5 w-3.5 text-blue-600" />
              )}
            </div>
          </Link>
        );
      })}

      {onLoadMore && (
        <LoadMoreButton
          onClick={onLoadMore}
          loading={loading}
          hasMore={hasMore}
          className="border-t"
        />
      )}
    </div>
  );
}
