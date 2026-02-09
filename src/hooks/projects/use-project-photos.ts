"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface ProjectPhoto {
  id: number;
  projectId: number;
  milestoneId: number | null;
  uploadedBy: number;
  fileUrl: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  latitude: string | null;
  longitude: string | null;
  accuracy: string | null;
  category: string | null;
  note: string | null;
  capturedAt: string;
  createdAt: string;
  uploaderName: string | null;
  tags: string[];
}

interface PhotosResponse {
  photos: ProjectPhoto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PhotoFilters {
  milestoneId?: number;
  category?: string;
  page?: number;
}

export function useProjectPhotos(
  projectId: number | null,
  enabled = true,
  filters?: PhotoFilters,
) {
  return useQuery({
    queryKey: ["project-photos", projectId, filters],
    queryFn: async () => {
      if (!projectId) throw new Error("Project ID is required");
      const params = new URLSearchParams();
      if (filters?.milestoneId)
        params.set("milestoneId", String(filters.milestoneId));
      if (filters?.category) params.set("category", filters.category);
      if (filters?.page) params.set("page", String(filters.page));
      const query = params.toString();
      const { data } = await axios.get<PhotosResponse>(
        `/api/projects/${projectId}/photos${query ? `?${query}` : ""}`,
      );
      return data;
    },
    enabled: enabled && projectId !== null,
    staleTime: 30 * 1000,
  });
}
