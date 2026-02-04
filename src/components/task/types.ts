import type React from "react";

export type StatusType =
  | "Backlog"
  | "Todo"
  | "In Progress"
  | "Review"
  | "Completed";

export type PriorityType = "Low" | "Medium" | "High" | "Urgent";

export interface Status {
  id: string;
  name: StatusType;
  color: string;
  icon: React.FC;
}

export interface Label {
  id: number | null;
  name: string | null;
  color: string | null;
}

export interface User {
  id: number | null;
  email: string | null;
  name: string | null;
  avatar: string | null;
}

export interface BoardTask {
  id: number;
  title: string;
  description: string | null;
  status: StatusType;
  priority: PriorityType;
  dueDate: string | null;
  attachments: { url: string; name: string }[];
  links: { url: string; title: string }[];
  progressCompleted: number;
  progressTotal: number;
  createdAt: Date;
  updatedAt: Date;
  assignedBy: User | null;
  assignees: User[];
  labels: Label[];
  comments: number;
}

export interface BoardData {
  tasksByStatus: Record<StatusType, BoardTask[]>;
  labels: { id: number; name: string; color: string }[];
  statuses: StatusType[];
}
