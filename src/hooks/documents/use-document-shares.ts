"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface DocumentShare {
  userId: number | null;
  accessLevel: string;
  createdAt: Date;
  name: string | null;
  email: string | null;
}

interface DocumentSharesResponse {
  shares: DocumentShare[];
}

export function useDocumentShares(documentId: number, enabled = true) {
  return useQuery({
    queryKey: ["document-shares", documentId],
    queryFn: async () => {
      const { data } = await axios.get<DocumentSharesResponse>(
        `/api/documents/${documentId}/shares`,
      );
      return data.shares;
    },
    enabled: enabled && documentId > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}
