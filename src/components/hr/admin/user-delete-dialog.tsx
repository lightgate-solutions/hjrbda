"use client";

import { useState } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { UserWithDetails } from "@/actions/auth/users";
import { deleteUser } from "@/actions/auth/auth";
import { toast } from "sonner";

interface UserDeleteDialogProps {
  user: UserWithDetails;
  isOpen: boolean;
  onCloseAction: () => void;
}

export function UserDeleteDialog({
  user,
  isOpen,
  onCloseAction,
}: UserDeleteDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteUser = async () => {
    setIsLoading(true);
    const res = await deleteUser(user.id);
    if (res.error) {
      toast.error(res.error.reason);
    } else {
      toast.success(`${user.name || user.email} has been deleted.`);
    }
    setIsLoading(false);
  };

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      onConfirmAction={handleDeleteUser}
      title={`Delete User: ${user.name || user.email}`}
      description="This action cannot be undone. This will permanently delete the user and remove their data from the system."
      confirmText={isLoading ? "Processing..." : "Delete User"}
      confirmVariant="destructive"
    />
  );
}
