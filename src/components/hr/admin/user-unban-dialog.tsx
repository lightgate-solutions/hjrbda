"use client";

import { useState } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { UserWithDetails } from "@/actions/auth/users";
import { unbanUser } from "@/actions/auth/auth";
import { toast } from "sonner";

interface UserUnbanDialogProps {
  user: UserWithDetails;
  isOpen: boolean;
  onCloseAction: () => void;
}

export function UserUnbanDialog({
  user,
  isOpen,
  onCloseAction,
}: UserUnbanDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUnbanUser = async () => {
    setIsLoading(true);
    const res = await unbanUser(user.id);
    if (res.error) {
      toast.error(res.error.reason);
    } else {
      toast.success(`${user.name || user.email} has been unbanned.`);
    }
    setIsLoading(false);
  };

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      onConfirmAction={handleUnbanUser}
      title={`Unban User: ${user.name || user.email}`}
      description="This will restore the user's access to the platform."
      confirmText={isLoading ? "Processing..." : "Unban User"}
    />
  );
}
