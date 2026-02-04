/** biome-ignore-all lint/a11y/noStaticElementInteractions: <> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <> */

"use client";

import { useState } from "react";
import {
  Calendar,
  MessageSquare,
  FileText,
  Link,
  CheckCircle,
  InfoIcon,
  Hexagon,
  Stars,
  Minus,
  CircleDotDashed,
  Circle,
  Timer,
  Hourglass,
  CalendarCheck2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import type { BoardTask, StatusType } from "../types";
import { TaskViewDialog } from "../dialogs/task-view-dialog";

interface TaskCardProps {
  task: BoardTask;
  onStatusChange: (taskId: number, newStatus: StatusType) => void;
  employeeId: number;
  role: "employee" | "manager" | "admin" | "self";
}

const statusIcons: Record<StatusType, React.FC> = {
  Backlog: CircleDotDashed,
  Todo: Circle,
  "In Progress": Timer,
  Review: Hourglass,
  Completed: CalendarCheck2,
};

export function TaskCard({
  task,
  onStatusChange,
  employeeId,
  role,
}: TaskCardProps) {
  const [showViewDialog, setShowViewDialog] = useState(false);

  const StatusIcon = statusIcons[task.status] || Circle;
  const hasProgress = task.progressTotal > 0;
  const isCompleted =
    task.progressCompleted === task.progressTotal && hasProgress;

  const formattedDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <>
      <div
        className="bg-background shrink-0 rounded-lg overflow-hidden border border-border cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => setShowViewDialog(true)}
      >
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-5 mt-0.5 shrink-0 flex items-center justify-center bg-muted rounded-sm p-1">
              <StatusIcon />
            </div>
            <h3 className="text-xs font-medium leading-tight flex-1">
              {task.title}
            </h3>
            {task.priority === "Urgent" && !isCompleted && (
              <Stars className="size-4 shrink-0 text-pink-500" />
            )}
            {task.priority === "High" && !isCompleted && (
              <InfoIcon className="size-4 shrink-0 text-red-500" />
            )}
            {task.priority === "Medium" && !isCompleted && (
              <Hexagon className="size-4 shrink-0 text-cyan-500" />
            )}
            {task.priority === "Low" && !isCompleted && (
              <Minus className="size-4 shrink-0 text-gray-400" />
            )}
            {isCompleted && (
              <CheckCircle className="size-4 shrink-0 text-green-500" />
            )}
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.labels.map((label) => (
                <Badge
                  key={label.id}
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 font-medium",
                    label.color,
                  )}
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="px-3 py-2.5 border-t border-border border-dashed">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {formattedDate && (
                <div className="flex items-center gap-1.5 border border-border rounded-sm py-1 px-2">
                  <Calendar className="size-3" />
                  <span>{formattedDate}</span>
                </div>
              )}
              {task.comments > 0 && (
                <div className="flex items-center gap-1.5 border border-border rounded-sm py-1 px-2">
                  <MessageSquare className="size-3" />
                  <span>{task.comments}</span>
                </div>
              )}
              {task.attachments.length > 0 && (
                <div className="flex items-center gap-1.5 border border-border rounded-sm py-1 px-2">
                  <FileText className="size-3" />
                  <span>{task.attachments.length}</span>
                </div>
              )}
              {task.links.length > 0 && (
                <div className="flex items-center gap-1.5 border border-border rounded-sm py-1 px-2">
                  <Link className="size-3" />
                  <span>{task.links.length}</span>
                </div>
              )}
              {hasProgress && (
                <div className="flex items-center gap-1.5 border border-border rounded-sm py-1 px-2">
                  {isCompleted ? (
                    <CheckCircle className="size-3 text-green-500" />
                  ) : (
                    <div className="size-3">
                      <CircularProgressbar
                        value={
                          (task.progressCompleted / task.progressTotal) * 100
                        }
                        strokeWidth={12}
                        styles={buildStyles({
                          pathColor: "#10b981",
                          trailColor: "#EDEDED",
                          strokeLinecap: "round",
                        })}
                      />
                    </div>
                  )}
                  <span>
                    {task.progressCompleted}/{task.progressTotal}
                  </span>
                </div>
              )}
            </div>

            {task.assignees.length > 0 && (
              <div className="flex -space-x-2">
                {task.assignees.slice(0, 3).map((user) => (
                  <Avatar
                    key={user.id}
                    className="size-5 border-2 border-background"
                  >
                    <AvatarImage
                      src={user.avatar || ""}
                      alt={user.name || ""}
                    />
                    <AvatarFallback className="text-[10px]">
                      {user.name
                        ? user.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                        : "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {task.assignees.length > 3 && (
                  <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] border-2 border-background">
                    +{task.assignees.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <TaskViewDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        task={task}
        onStatusChange={onStatusChange}
        employeeId={employeeId}
        role={role}
      />
    </>
  );
}
