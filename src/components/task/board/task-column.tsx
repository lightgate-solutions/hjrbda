"use client";

import { useState } from "react";
import type { BoardTask, Status, StatusType } from "../types";
import { TaskCard } from "./task-card";
import { Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskFormDialog } from "../dialogs/task-form-dialog";
import { Draggable, Droppable } from "@hello-pangea/dnd";

interface TaskColumnProps {
  status: Status;
  tasks: BoardTask[];
  onStatusChange: (taskId: number, newStatus: StatusType) => void;
  onClearCompleted?: () => void;
  employeeId: number;
  role: "employee" | "manager" | "admin" | "self";
}

export function TaskColumn({
  status,
  tasks,
  onStatusChange,
  onClearCompleted,
  employeeId,
  role,
}: TaskColumnProps) {
  const StatusIcon = status.icon;
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const canCreate = role === "manager" || role === "admin" || role === "self";
  const canClear =
    (role === "manager" || role === "admin" || role === "self") &&
    status.name === "Completed";

  return (
    <div className="shrink-0 w-[300px] lg:w-[360px] flex flex-col h-full flex-1">
      <div className="rounded-lg border border-border p-3 bg-muted/70 dark:bg-muted/50 flex flex-col max-h-full">
        <div className="flex items-center justify-between mb-2 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="size-4 flex items-center justify-center">
              <StatusIcon />
            </div>
            <span className="text-sm font-medium">{status.name}</span>
            <span className="text-xs text-muted-foreground">
              {tasks.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {canCreate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="size-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canClear && (
                  <DropdownMenuItem onClick={onClearCompleted}>
                    Clear completed
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Droppable
          droppableId={status.name}
          isDropDisabled={role === "employee" && status.name === "Completed"}
        >
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex flex-col gap-3 overflow-y-auto h-full min-h-[100px]"
            >
              {tasks.map((task, index) => (
                <Draggable
                  key={task.id}
                  draggableId={task.id.toString()}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{ ...provided.draggableProps.style }}
                    >
                      <TaskCard
                        task={task}
                        onStatusChange={onStatusChange}
                        employeeId={employeeId}
                        role={role}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              {canCreate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-xs h-auto py-1 px-0 self-start hover:bg-background"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="size-4" />
                  <span>Add task</span>
                </Button>
              )}
            </div>
          )}
        </Droppable>
      </div>

      {canCreate && (
        <TaskFormDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          defaultStatus={status.name}
          employeeId={employeeId}
          role={role}
        />
      )}
    </div>
  );
}
