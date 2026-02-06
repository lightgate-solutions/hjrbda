"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface DocumentComment {
  id: number;
  comment: string;
  createdAt: Date;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
}

interface DocumentCommentsResponse {
  comments: DocumentComment[];
}

export function useDocumentComments(documentId: number, enabled = true) {
  return useQuery({
    queryKey: ["document-comments", documentId],
    queryFn: async () => {
      const { data } = await axios.get<DocumentCommentsResponse>(
        `/api/documents/${documentId}/comments`,
      );
      return data.comments;
    },
    enabled: enabled && documentId > 0,
    staleTime: 10 * 1000, // 10 seconds
  });
}
