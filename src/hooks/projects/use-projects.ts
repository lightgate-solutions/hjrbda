"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect } from "react";
import { setCachedProjects } from "@/lib/offline-photo-store";

interface ProjectMember {
  projectId: number;
  employeeId: number;
  employee: {
    id: number;
    name: string;
    email: string;
  };
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
  creatorId: number | null;
  createdAt: Date;
  updatedAt: Date;
  supervisor?: {
    id: number;
    name: string;
    email: string;
  } | null;
  members: ProjectMember[];
}

interface ProjectsResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UseProjectsParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export function useProjects(params: UseProjectsParams = {}) {
  const {
    page = 1,
    limit = 10,
    q = "",
    status = "",
    dateFrom = "",
    dateTo = "",
    sortBy = "createdAt",
    sortDirection = "desc",
  } = params;

  const query = useQuery({
    queryKey: [
      "projects",
      page,
      limit,
      q,
      status,
      dateFrom,
      dateTo,
      sortBy,
      sortDirection,
    ],
    queryFn: async () => {
      const { data } = await axios.get<ProjectsResponse>("/api/projects", {
        params: {
          page,
          limit,
          q,
          status,
          dateFrom,
          dateTo,
          sortBy,
          sortDirection,
        },
      });
      return data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Cache projects in IndexedDB for offline use
  useEffect(() => {
    if (query.data?.projects) {
      setCachedProjects(
        query.data.projects.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          status: p.status,
        })),
      ).catch(() => {
        // Silently fail — IndexedDB might not be available
      });
    }
  }, [query.data?.projects]);

  return query;
}
