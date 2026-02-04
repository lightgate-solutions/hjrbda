"use client";

import { useState } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { UserWithDetails } from "@/actions/auth/users";
import { revokeUserSessions } from "@/actions/auth/auth";
import { toast } from "sonner";

interface UserRevokeSessionsDialogProps {
  user: UserWithDetails;
  isOpen: boolean;
  onCloseAction: () => void;
}

export function UserRevokeSessionsDialog({
  user,
  isOpen,
  onCloseAction,
}: UserRevokeSessionsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRevokeSessions = async () => {
    setIsLoading(true);
    const res = await revokeUserSessions(user.id);
    if (res.error) {
      toast.error(res.error.reason);
    } else {
      toast.success(
        `All sessions for ${user.name || user.email} have been revoked.`,
      );
      onCloseAction();
    }
    setIsLoading(false);
  };

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      onConfirmAction={handleRevokeSessions}
      title={`Revoke Sessions: ${user.name || user.email}`}
      description="This will log the user out of all devices. They will need to log in again to access their account."
      confirmText={isLoading ? "Processing..." : "Revoke Sessions"}
      confirmVariant="destructive"
    />
  );
}
