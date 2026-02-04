"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserWithDetails } from "@/actions/auth/users";
import { updateUserRole } from "@/actions/auth/auth";
import { toast } from "sonner";

interface UserRoleDialogProps {
  user: UserWithDetails;
  isOpen: boolean;
  onCloseAction: () => void;
}

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "User", value: "user" },
];

export function UserRoleDialog({
  user,
  isOpen,
  onCloseAction,
}: UserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState(user.role || "user");
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateRole = async () => {
    setIsLoading(true);
    const res = await updateUserRole(user.id, selectedRole);
    if (res.error) {
      toast.error(res.error.reason);
    } else {
      toast.success(`User role updated to ${selectedRole}`);
      onCloseAction();
    }
    setIsLoading(false);
  };

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      onConfirmAction={handleUpdateRole}
      title={`Update Role: ${user.name || user.email}`}
      description="Change the user's role in the system."
      confirmText={isLoading ? "Processing..." : "Update Role"}
    >
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="role">Select Role *</Label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger id="role" className="w-full">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="hover:bg-muted"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ConfirmationDialog>
  );
}
