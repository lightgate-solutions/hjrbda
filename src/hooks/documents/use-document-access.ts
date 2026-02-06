"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface DocumentAccessResponse {
  level: "none" | "view" | "edit" | "manage";
  isOwner: boolean;
  isAdminDepartment: boolean;
}

export function useDocumentAccess(documentId: number, enabled = true) {
  return useQuery({
    queryKey: ["document-access", documentId],
    queryFn: async () => {
      const { data } = await axios.get<DocumentAccessResponse>(
        `/api/documents/${documentId}/access`,
      );
      return data;
    },
    enabled: enabled && documentId > 0,
    staleTime: 60 * 1000, // 1 minute
  });
}
