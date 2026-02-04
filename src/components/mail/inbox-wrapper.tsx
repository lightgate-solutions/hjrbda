"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ComposeEmail } from "./compose-email";
import { ReplyForwardEmail } from "./reply-forward-email";
import { Button } from "../ui/button";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
}

interface InboxWrapperProps {
  children: React.ReactNode;
  users: User[];
  selectedEmail?: {
    id: number;
    subject: string;
    body: string;
    senderName: string;
    senderEmail: string;
    senderId: number;
    createdAt: Date;
  } | null;
}

export function InboxWrapper({
  children,
  users,
  selectedEmail,
}: InboxWrapperProps) {
  const router = useRouter();
  const [showCompose, setShowCompose] = useState(false);
  const [showReplyForward, setShowReplyForward] = useState(false);
  const [replyForwardMode, setReplyForwardMode] = useState<"reply" | "forward">(
    "reply",
  );

  const handleCompose = () => {
    setShowCompose(true);
  };

  const handleReply = () => {
    setReplyForwardMode("reply");
    setShowReplyForward(true);
  };

  const handleForward = () => {
    setReplyForwardMode("forward");
    setShowReplyForward(true);
  };

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <Button
        data-compose-trigger
        onClick={handleCompose}
        style={{ display: "none" }}
      />
      <Button
        data-reply-trigger
        onClick={handleReply}
        style={{ display: "none" }}
      />
      <Button
        data-forward-trigger
        onClick={handleForward}
        style={{ display: "none" }}
      />

      {children}

      <ComposeEmail
        open={showCompose}
        onOpenChange={setShowCompose}
        users={users}
        onSuccess={handleSuccess}
      />

      {selectedEmail && (
        <ReplyForwardEmail
          open={showReplyForward}
          onOpenChange={setShowReplyForward}
          mode={replyForwardMode}
          originalEmail={selectedEmail}
          users={users}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
