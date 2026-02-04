"use client";

import { useCallback, useEffect, useState } from "react";
import { TaskColumn } from "./task-column";
import type { BoardTask, Status, StatusType } from "../types";
import {
  CalendarCheck2,
  Circle,
  CircleDotDashed,
  Hourglass,
  Loader2,
  Timer,
} from "lucide-react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";

const statusConfig: Status[] = [
  { id: "Backlog", name: "Backlog", color: "#53565A", icon: CircleDotDashed },
  { id: "Todo", name: "Todo", color: "#53565A", icon: Circle },
  {
    id: "In Progress",
    name: "In Progress",
    color: "#facc15",
    icon: Timer,
  },
  {
    id: "Review",
    name: "Review",
    color: "#22c55e",
    icon: Hourglass,
  },
  {
    id: "Completed",
    name: "Completed",
    color: "#8b5cf6",
    icon: CalendarCheck2,
  },
];

interface TaskBoardProps {
  employeeId: number;
  role: "employee" | "manager" | "admin" | "self";
  priority?: string;
  assignee?: string;
  search?: string;
}

export function TaskBoard({
  employeeId,
  role,
  priority,
  assignee,
  search,
}: TaskBoardProps) {
  const [tasksByStatus, setTasksByStatus] = useState<
    Record<StatusType, BoardTask[]>
  >({
    Backlog: [],
    Todo: [],
    "In Progress": [],
    Review: [],
    Completed: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        employeeId: employeeId.toString(),
        role,
      });

      if (priority && priority !== "all") {
        params.set("priority", priority);
      }
      if (assignee) {
        params.set("assignee", assignee);
      }
      if (search) {
        params.set("q", search);
      }

      const res = await fetch(`/api/tasks/board?${params.toString()}`);
      const data = await res.json();

      if (data.tasksByStatus) {
        setTasksByStatus(data.tasksByStatus);
      }
    } catch (error) {
      console.error("Error fetching board tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [employeeId, role, priority, assignee, search]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Listen for task changes
  useEffect(() => {
    const handleTasksChanged = () => {
      fetchTasks();
    };

    window.addEventListener("tasks:changed", handleTasksChanged);
    return () => {
      window.removeEventListener("tasks:changed", handleTasksChanged);
    };
  }, [fetchTasks]);

  const handleStatusChange = async (taskId: number, newStatus: StatusType) => {
    try {
      await fetch("/api/tasks/board", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus, employeeId }),
      });

      // Refresh tasks
      fetchTasks();
      window.dispatchEvent(new CustomEvent("tasks:changed"));
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleClearCompleted = async () => {
    try {
      const params = new URLSearchParams({
        employeeId: employeeId.toString(),
        role,
      });

      const res = await fetch(`/api/tasks/board?${params.toString()}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchTasks();
        window.dispatchEvent(new CustomEvent("tasks:changed"));
      }
    } catch (error) {
      console.error("Error clearing completed tasks:", error);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId as StatusType;
    const destStatus = destination.droppableId as StatusType;

    // Prevent employees from moving tasks to Completed
    if (role === "employee" && destStatus === "Completed") {
      return;
    }

    // Create a copy of the current state
    const newTasksByStatus = { ...tasksByStatus };

    // Remove from source column
    const sourceTasks = Array.from(newTasksByStatus[sourceStatus]);
    const [movedTask] = sourceTasks.splice(source.index, 1);

    // Update task status locally
    const updatedTask = { ...movedTask, status: destStatus };

    // Add to destination column
    const destTasks = Array.from(newTasksByStatus[destStatus]);
    destTasks.splice(destination.index, 0, updatedTask);

    // Update state
    newTasksByStatus[sourceStatus] = sourceTasks;
    newTasksByStatus[destStatus] = destTasks;
    setTasksByStatus(newTasksByStatus);

    // Call API if status changed
    if (sourceStatus !== destStatus) {
      try {
        const res = await fetch("/api/tasks/board", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: Number.parseInt(draggableId),
            status: destStatus,
            employeeId,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update status");
        }
        window.dispatchEvent(new CustomEvent("tasks:changed"));
      } catch (error: any) {
        console.error("Error updating task status:", error);
        toast.error(error.message || "Error updating task status");
        // Revert on error
        fetchTasks();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full gap-3 px-3 pt-4 pb-2 overflow-hidden overflow-x-auto">
        {statusConfig.map((status) => (
          <TaskColumn
            key={status.id}
            status={status}
            tasks={tasksByStatus[status.name] || []}
            onStatusChange={handleStatusChange}
            onClearCompleted={handleClearCompleted}
            employeeId={employeeId}
            role={role}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
