"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface Document {
  id: number;
  title: string;
  description: string | null;
  public: boolean;
  departmental: boolean;
  department: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  currentVersion: number;
  uploader: string | null;
  uploaderId: number | null;
  uploaderEmail: string | null;
  folderName: string | null;
  folderId: number | null;
  fileSize: string | null;
  filePath: string | null;
  mimeType: string | null;
  tags: string[];
  accessRules: {
    accessLevel: string;
    userId: number | null;
    name: string | null;
    email: string | null;
    department: string | null;
  }[];
  loggedUser: unknown;
}

interface AllDocumentsResponse {
  docs: Document[];
  count: number;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export function useAllAccessibleDocuments(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["all-documents", page, pageSize],
    queryFn: async () => {
      const { data } = await axios.get<AllDocumentsResponse>(
        "/api/documents/all",
        {
          params: { page, pageSize },
        },
      );
      return data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}
