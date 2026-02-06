"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface DocumentLog {
  id: number;
  action: string;
  details: string | null;
  createdAt: Date;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  documentVersionId: number | null;
}

interface DocumentLogsResponse {
  logs: DocumentLog[];
}

export function useDocumentLogs(documentId: number, enabled = true) {
  return useQuery({
    queryKey: ["document-logs", documentId],
    queryFn: async () => {
      const { data } = await axios.get<DocumentLogsResponse>(
        `/api/documents/${documentId}/logs`,
      );
      return data.logs;
    },
    enabled: enabled && documentId > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}
