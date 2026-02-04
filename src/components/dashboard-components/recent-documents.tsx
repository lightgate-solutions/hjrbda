"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { FileText, Calendar, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface RecentDocument {
  id: number;
  name: string;
  uploadedDate: string;
  size: string;
  uploadedBy?: string;
}

export default function RecentDocuments() {
  const [documents, setDocuments] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const wasHiddenRef = useRef(document.hidden);

  const fetchRecentDocuments = useCallback(async () => {
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`/api/documents/recent?t=${timestamp}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      clearTimeout(timeoutId);

      // Handle non-ok responses
      if (!response.ok) {
        // Build basic error details first
        const status = response.status;
        const statusText = response.statusText;
        const url = response.url;
        let errorMessage = `HTTP ${status}: ${statusText}`;
        let errorData: Record<string, unknown> = {};
        let responseText = "";

        // Log basic response info immediately
        console.error("[RecentDocuments] API Error - Basic Info:", {
          status,
          statusText,
          url,
          ok: response.ok,
          type: response.type,
          redirected: response.redirected,
        });

        try {
          // Read response body
          responseText = await response.text();
          const hasBody = !!responseText;
          const bodyLength = responseText?.length || 0;

          console.error("[RecentDocuments] API Error - Response Body:", {
            hasBody,
            bodyLength,
            responseText: responseText || "(empty)",
          });

          if (responseText?.trim()) {
            try {
              const parsed = JSON.parse(responseText) as Record<
                string,
                unknown
              >;
              errorData = parsed;
              errorMessage =
                (typeof parsed.error === "string" ? parsed.error : null) ||
                (typeof parsed.message === "string" ? parsed.message : null) ||
                errorMessage;
              console.error(
                "[RecentDocuments] API Error - Parsed JSON:",
                errorData,
              );
            } catch (parseError) {
              // If it's not JSON, use the text as the error message
              errorMessage = responseText || errorMessage;
              errorData = { rawText: responseText };
              console.error("[RecentDocuments] API Error - Parse Failed:", {
                parseError:
                  parseError instanceof Error
                    ? parseError.message
                    : String(parseError),
                rawText: responseText,
              });
            }
          } else {
            errorData = { emptyResponse: true, note: "Response body is empty" };
            console.error("[RecentDocuments] API Error - Empty Body");
          }

          // Try to get headers
          try {
            const headers = Object.fromEntries(response.headers.entries());
            console.error("[RecentDocuments] API Error - Headers:", headers);
          } catch (headerError) {
            console.error("[RecentDocuments] API Error - Header Read Failed:", {
              headerError:
                headerError instanceof Error
                  ? headerError.message
                  : String(headerError),
            });
          }
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          console.error("[RecentDocuments] API Error - Read Failed:", {
            error: error.message,
            stack: error.stack,
          });
          errorData = {
            readError: error.message,
            errorStack: error.stack,
          };
        }

        // Build complete error details object
        const errorDetails = {
          status,
          statusText,
          statusCode: status,
          url,
          errorMessage,
          errorData,
          responseText: responseText || "(empty)",
          timestamp: new Date().toISOString(),
        };

        // Log complete error details
        console.error(
          "[RecentDocuments] API Error Details (Complete):",
          errorDetails,
        );
        console.error(
          "[RecentDocuments] API Error Details (Stringified):",
          JSON.stringify(errorDetails, null, 2),
        );

        // Handle specific error cases with additional context
        if (status === 403) {
          console.warn("[RecentDocuments] Access Denied - User is not admin");
          console.warn(
            "[RecentDocuments] This component requires admin role to view all recent documents",
          );
          console.warn(
            "[RecentDocuments] Status:",
            status,
            "Message:",
            errorMessage,
          );
        } else if (status === 401) {
          console.warn(
            "[RecentDocuments] Unauthorized - User is not authenticated",
          );
          console.warn(
            "[RecentDocuments] Status:",
            status,
            "Message:",
            errorMessage,
          );
        } else if (status >= 500) {
          console.error(
            "[RecentDocuments] Server Error - API endpoint may be broken",
          );
          console.error(
            "[RecentDocuments] Status:",
            status,
            "Message:",
            errorMessage,
          );
        } else {
          console.error("[RecentDocuments] Unexpected error status:", status);
          console.error(
            "[RecentDocuments] Status:",
            status,
            "Message:",
            errorMessage,
          );
        }

        setDocuments([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const data = await response.json();

      // Ensure we have valid documents array
      const docs = Array.isArray(data.documents) ? data.documents : [];

      setDocuments(docs);
    } catch (error) {
      // Suppress network errors (common during server restarts or temporary connectivity issues)
      if (error instanceof Error && error.name === "AbortError") {
        // Timeout - don't log, keep existing documents
        // Loading state will be cleared in finally block
      } else if (
        error instanceof TypeError &&
        error.message === "Failed to fetch"
      ) {
        // Network error - don't spam console, keep existing documents
        // Loading state will be cleared in finally block
      } else {
        console.error("[RecentDocuments] Fetch error:", error);
        // Only clear documents if it's not a network error
        setDocuments([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchRecentDocuments();

    // Refresh every 30 seconds to catch new uploads (less aggressive)
    const interval = setInterval(() => {
      if (!document.hidden && document.hasFocus()) {
        fetchRecentDocuments();
      }
    }, 30000);

    // Refresh when page becomes visible (only once when becoming visible)
    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      // Only refresh when transitioning from hidden to visible
      if (wasHiddenRef.current && !isHidden) {
        fetchRecentDocuments();
      }
      wasHiddenRef.current = isHidden;
    };

    // Listen for storage events (cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "document-uploaded") {
        // Small delay to ensure database transaction is committed
        setTimeout(() => {
          fetchRecentDocuments();
        }, 500);
      }
    };

    // Listen for custom document upload events (same tab)
    const handleDocumentUpload = () => {
      // Small delay to ensure database transaction is committed
      setTimeout(() => {
        fetchRecentDocuments();
      }, 500);
    };

    // Set up all event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("document-uploaded", handleDocumentUpload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("document-uploaded", handleDocumentUpload);
    };
  }, [fetchRecentDocuments]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecentDocuments();
  };

  if (loading) {
    return (
      <Card className="border border-purple-100 dark:border-gray-800 bg-[#FAF9FF] dark:bg-gray-900/50 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-50 font-bold">
            Recent Documents
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 font-semibold">
            Latest documents uploaded by users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Static array for loading skeletons
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="border border-purple-100 dark:border-gray-800 bg-[#FAF9FF] dark:bg-gray-900/50 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-50 font-bold">
            Recent Documents
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 font-semibold">
            Latest documents uploaded by users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-[#F3E8FF] dark:bg-purple-950/50 p-3 mb-2">
              <FileText className="h-8 w-8 text-[#9333EA] dark:text-purple-400" />
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              No recent documents
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-purple-100 dark:border-gray-800 bg-[#FAF9FF] dark:bg-gray-900/50 shadow-sm rounded-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-gray-900 dark:text-gray-50 font-bold">
              Recent Documents
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 font-semibold">
              Latest documents uploaded by users
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 w-8"
            aria-label="Refresh documents"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="block p-3 rounded-lg border border-purple-100/50 dark:border-gray-800 bg-white/60 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800/70 transition-all backdrop-blur-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="rounded-lg bg-[#F3E8FF] dark:bg-purple-950/50 p-2.5 shrink-0 mt-0.5">
                    <FileText className="h-5 w-5 text-[#9333EA] dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                        {doc.uploadedDate}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {doc.size}
                      </span>
                      {doc.uploadedBy && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          by {doc.uploadedBy}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-purple-100/50 dark:border-gray-800">
          <Link
            href="/documents/all"
            className="text-sm font-bold text-[#9333EA] dark:text-purple-400 hover:underline inline-flex items-center gap-1"
          >
            View all documents
            <svg
              className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-label="Arrow right"
              role="img"
            >
              <title>Arrow right</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
