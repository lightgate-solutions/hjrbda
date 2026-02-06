"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface FolderDocument {
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
  fileSize: string | null;
  filePath: string | null;
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

interface FolderDocumentsResponse {
  docs: FolderDocument[];
  count: number;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export function useActiveFolderDocuments(
  folderId: number,
  page = 1,
  pageSize = 20,
  enabled = true,
) {
  return useQuery({
    queryKey: ["folder-documents", folderId, page, pageSize],
    queryFn: async () => {
      const { data } = await axios.get<FolderDocumentsResponse>(
        `/api/documents/folders/${folderId}/documents`,
        {
          params: { page, pageSize },
        },
      );
      return data;
    },
    enabled: enabled && folderId > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}
