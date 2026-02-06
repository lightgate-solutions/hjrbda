"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface DocumentVersion {
  id: number;
  versionNumber: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
  uploadedBy: number | null;
  uploadedByName: string | null;
  uploadedByEmail: string | null;
}

interface DocumentVersionsResponse {
  versions: DocumentVersion[];
}

export function useDocumentVersions(documentId: number, enabled = true) {
  return useQuery({
    queryKey: ["document-versions", documentId],
    queryFn: async () => {
      const { data } = await axios.get<DocumentVersionsResponse>(
        `/api/documents/${documentId}/versions`,
      );
      return data.versions;
    },
    enabled: enabled && documentId > 0,
    staleTime: 60 * 1000, // 1 minute
  });
}
