"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface ProjectMember {
  projectId: number;
  employeeId: number;
  employee: {
    id: number;
    name: string;
    email: string;
    role: string;
    department: string;
  };
}

interface Milestone {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  dueDate: Date | null;
  completed: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Project {
  id: number;
  name: string;
  code: string;
  description: string | null;
  street: string;
  city: string;
  state: string;
  latitude: string | null;
  longitude: string | null;
  status: "pending" | "in-progress" | "completed";
  budgetPlanned: number | null;
  budgetActual: number | null;
  supervisorId: number | null;
  contractorId: number | null;
  creatorId: number | null;
  createdAt: Date;
  updatedAt: Date;
  supervisor?: {
    id: number;
    name: string;
    email: string;
    department: string;
  } | null;
  contractor?: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  creator?: {
    id: number;
    name: string;
    email: string;
  } | null;
  members: ProjectMember[];
  milestones: Milestone[];
}

interface ProjectResponse {
  project: Project;
}

export function useProject(projectId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Project ID is required");
      const { data } = await axios.get<ProjectResponse>(
        `/api/projects/${projectId}`,
      );
      return data.project;
    },
    enabled: enabled && projectId !== null,
    staleTime: 30 * 1000, // 30 seconds
  });
}
