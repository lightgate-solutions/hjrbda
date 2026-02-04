import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  getInboxEmails,
  getEmailById,
  markEmailAsRead,
} from "@/actions/mail/email";
import { MailContent } from "@/components/mail/mail-content";

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function InboxPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const emailId = params.id;

  // Fetch emails
  const emailsResult = await getInboxEmails(1, 20);

  let selectedEmail = null;
  if (emailId) {
    const emailResult = await getEmailById(Number(emailId));
    if (emailResult.success && emailResult.data) {
      selectedEmail = emailResult.data;

      // Mark as read if not already read
      if (
        emailResult.data.isRecipient &&
        !emailResult.data.recipientStatus?.isRead
      ) {
        await markEmailAsRead(Number(emailId));
      }
    }
  }

  const emails =
    emailsResult.success && emailsResult.data ? emailsResult.data.emails : [];

  return (
    <MailContent emails={emails} selectedEmail={selectedEmail} folder="inbox" />
  );
}
