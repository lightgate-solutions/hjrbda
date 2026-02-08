"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface Subfolder {
  id: number;
  name: string;
  updatedAt: Date;
}

interface SubfoldersResponse {
  folders: Subfolder[];
}

export function useSubFolders(folderId: number, enabled = true) {
  return useQuery({
    queryKey: ["subfolders", folderId],
    queryFn: async () => {
      const { data } = await axios.get<SubfoldersResponse>(
        `/api/documents/folders/${folderId}/subfolders`,
      );
      return data.folders;
    },
    enabled: enabled && folderId > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
