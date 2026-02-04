"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskFilters } from "./task-filters";
import { TaskFormDialog } from "../dialogs/task-form-dialog";

interface TaskHeaderProps {
  employeeId: number;
  role: "employee" | "manager" | "admin" | "self";
  priority: string;
  assignee: string;
  search: string;
  onPriorityChange: (priority: string) => void;
  onAssigneeChange: (assignee: string) => void;
  onSearchChange: (search: string) => void;
}

export function TaskHeader({
  employeeId,
  role,
  priority,
  assignee,
  search,
  onPriorityChange,
  onAssigneeChange,
  onSearchChange,
}: TaskHeaderProps) {
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);

  const canCreate = role === "manager" || role === "admin" || role === "self";

  return (
    <div className="bg-background">
      <div className="flex items-center justify-between px-3 lg:px-6 py-3 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 w-[200px] h-8"
            />
          </div>

          <TaskFilters
            priority={priority}
            assignee={assignee}
            onPriorityChange={onPriorityChange}
            onAssigneeChange={onAssigneeChange}
            role={role}
          />

          {canCreate && (
            <Button
              size="sm"
              className="sm:gap-2 shrink-0"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Create Task</span>
            </Button>
          )}
        </div>
      </div>

      {canCreate && (
        <TaskFormDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          employeeId={employeeId}
          role={role}
        />
      )}
    </div>
  );
}
