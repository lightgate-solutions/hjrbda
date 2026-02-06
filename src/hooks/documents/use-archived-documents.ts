"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface ArchivedDocument {
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
  fileSize: string;
  filePath: string;
  mimeType: string | null;
  loggedUser: number;
  tags: string[];
  accessRules: {
    accessLevel: string;
    userId: number | null;
    name: string | null;
    email: string | null;
    department: string | null;
  }[];
}

interface ArchivedDocumentsResponse {
  docs: ArchivedDocument[];
  count: number;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export function useArchivedDocuments(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["archived-documents", page, pageSize],
    queryFn: async () => {
      const { data } = await axios.get<ArchivedDocumentsResponse>(
        "/api/documents/archived",
        {
          params: { page, pageSize },
        },
      );
      return data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}
