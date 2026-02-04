"use client";

import { useState } from "react";
import { TaskHeader } from "./header/task-header";
import { TaskBoard } from "./board/task-board";

interface TaskBoardContainerProps {
  employeeId: number;
  role: "employee" | "manager" | "admin" | "self";
}

export function TaskBoardContainer({
  employeeId,
  role,
}: TaskBoardContainerProps) {
  const [priority, setPriority] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [search, setSearch] = useState("");

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-5rem)]">
      <TaskHeader
        employeeId={employeeId}
        role={role}
        priority={priority}
        assignee={assignee}
        search={search}
        onPriorityChange={setPriority}
        onAssigneeChange={setAssignee}
        onSearchChange={setSearch}
      />
      <main className="w-full h-full overflow-x-auto">
        <TaskBoard
          employeeId={employeeId}
          role={role}
          priority={priority}
          assignee={assignee}
          search={search}
        />
      </main>
    </div>
  );
}
