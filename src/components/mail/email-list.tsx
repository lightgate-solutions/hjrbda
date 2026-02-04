"use client";

import { formatDistanceToNow } from "date-fns";
import { Mail, Archive, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

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
  readAt?: Date | null;
}

interface EmailListProps {
  emails: Email[];
  onEmailClick: (emailId: number) => void;
  selectedEmailId?: string;
}

export function EmailList({
  emails,
  onEmailClick,
  selectedEmailId,
}: EmailListProps) {
  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Mail className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No emails found</p>
        <p className="text-sm">Your mailbox is empty</p>
      </div>
    );
  }

  const _getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const _truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  };
  return (
    <div className="flex flex-col gap-2 p-2">
      {emails.map((email) => (
        <button
          type="button"
          key={email.id}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onEmailClick(Number(email.id));
            }
          }}
          onClick={() => onEmailClick(Number(email.id))}
          className={cn(
            "group relative flex flex-col gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent hover:shadow-sm cursor-pointer w-full",
            Number(selectedEmailId) === email.id && "bg-muted shadow-sm",
            !email.isRead &&
              "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900",
          )}
        >
          <div className="flex w-full flex-col gap-1">
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "font-semibold",
                    !email.isRead && "text-blue-700 dark:text-blue-400",
                  )}
                >
                  {email.senderName}
                </div>
                {!email.isRead && (
                  <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                )}
              </div>
              <div className="ml-auto text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(email.createdAt), {
                  addSuffix: true,
                })}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium">{email.subject}</div>
              {email.type !== "sent" && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                  {email.type}
                </Badge>
              )}
            </div>
          </div>
          <div className="line-clamp-2 text-xs text-muted-foreground">
            {email.body.substring(0, 300)}
          </div>

          {/* Quick Actions (Visible on Hover) */}
          <div className="absolute right-2 top-2 hidden group-hover:flex gap-1 bg-background/80 backdrop-blur-sm rounded-md p-0.5 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Archive"
            >
              <Archive className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </button>
      ))}
    </div>
  );
}
