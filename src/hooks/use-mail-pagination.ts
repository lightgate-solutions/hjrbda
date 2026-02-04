// biome-ignore-all lint/style/noNonNullAssertion: <>
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Email {
  id: number;
  subject: string;
  body: string;
  createdAt: Date;
  type: string;
  senderId?: number;
  senderName?: string;
  senderEmail?: string;
  isRead?: boolean;
  readAt?: Date | null;
  hasBeenOpened?: boolean;
  recipients?: Array<{
    id: number;
    name: string;
    email: string;
    isRead: boolean;
    readAt?: Date | null;
  }>;
}

interface PaginationData {
  emails: Email[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UseMailPaginationProps {
  initialEmails: Email[];
  folder: "inbox" | "sent" | "archive" | "trash";
  fetchFunction: (
    page: number,
    limit: number,
  ) => Promise<{
    success: boolean;
    data: PaginationData | null;
    error: string | null;
  }>;
}

export function useMailPagination({
  initialEmails,
  folder: _folder,
  fetchFunction,
}: UseMailPaginationProps) {
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [_totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(initialEmails.length);
  const _router = useRouter();

  useEffect(() => {
    setEmails(initialEmails);
    setCurrentPage(1);
    setHasMore(initialEmails.length > 0);
  }, [initialEmails]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const nextPage = currentPage + 1;
      const result = await fetchFunction(nextPage, 20);

      if (result.success && result.data) {
        setEmails((prev) => [...prev, ...result.data!.emails]);
        setCurrentPage(nextPage);
        setTotalPages(result.data.pagination.totalPages);
        setTotal(result.data.pagination.total);
        setHasMore(nextPage < result.data.pagination.totalPages);
      }
    } catch (_error) {
      toast.error("Failed to load more emails");
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, currentPage, fetchFunction]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFunction(1, 20);
      if (result.success && result.data) {
        setEmails(result.data.emails);
        setCurrentPage(1);
        setTotalPages(result.data.pagination.totalPages);
        setTotal(result.data.pagination.total);
        setHasMore(1 < result.data.pagination.totalPages);
      }
    } catch (_error) {
      toast.error("Failed to refresh emails:");
    } finally {
      setLoading(false);
    }
  }, [fetchFunction]);

  return {
    emails,
    loading,
    hasMore,
    total,
    loadMore,
    refresh,
  };
}
