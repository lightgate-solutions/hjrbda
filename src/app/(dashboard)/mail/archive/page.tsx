import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  getArchivedEmails,
  getEmailById,
  markEmailAsRead,
  getEmailStats,
} from "@/actions/mail/email";
import { InboxClient } from "@/components/mail/inbox-client";
import { getAllEmployees } from "@/actions/hr/employees";

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ArchivePage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const emailId = params.id;

  // Fetch all data in parallel
  const [emailsResult, statsResult, usersResult] = await Promise.all([
    getArchivedEmails(1, 20),
    getEmailStats(),
    getAllEmployees(),
  ]);

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
  const _stats = statsResult.success
    ? statsResult.data
    : {
        unreadCount: 0,
        inboxCount: 0,
        archivedCount: 0,
        sentCount: 0,
        trashCount: 0,
      };

  return (
    <InboxClient
      emails={emails}
      selectedEmail={selectedEmail}
      users={usersResult ?? []}
      folder="archive"
    />
  );
}
