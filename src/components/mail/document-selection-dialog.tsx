/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <> */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <> */
/** biome-ignore-all lint/style/noNonNullAssertion: <> */

"use client";

import { useState, useEffect } from "react";
import { FileText, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadMoreButton } from "@/components/mail/load-more-button";
import { getAccessibleDocumentsForAttachmentPaginated } from "@/actions/mail/email";

interface Document {
  id: number;
  title: string;
  description: string | null;
  originalFileName: string | null;
  department: string;
  public: boolean | null;
  departmental: boolean | null;
  createdAt: Date;
  uploader: string | null;
  uploaderEmail: string | null;
  fileSize: string | null;
  mimeType: string | null;
}

interface DocumentSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDocuments: Document[];
  onDocumentsSelected: (documents: Document[]) => void;
  resetTrigger?: number;
}

export function DocumentSelectionDialog({
  open,
  onOpenChange,
  selectedDocuments,
  onDocumentsSelected,
  resetTrigger,
}: DocumentSelectionDialogProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<number>>(
    new Set(),
  );
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize selected IDs when dialog opens or selectedDocuments change
  useEffect(() => {
    if (open) {
      const newSelectedIds = new Set(selectedDocuments.map((doc) => doc.id));
      setLocalSelectedIds(newSelectedIds);
    }
  }, [open, selectedDocuments]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch documents when debounced search changes or dialog opens for first time
  useEffect(() => {
    if (open && !isInitialized) {
      fetchDocuments(1, true);
      setIsInitialized(true);
    } else if (debouncedSearch !== undefined) {
      // Reset and fetch when search changes
      fetchDocuments(1, true);
    }
  }, [open, debouncedSearch]);

  // Reset state when resetTrigger changes (compose dialog closes)
  useEffect(() => {
    if (resetTrigger !== undefined) {
      resetState();
    }
  }, [resetTrigger]);

  const fetchDocuments = async (page: number, replace = false) => {
    setLoading(true);
    try {
      const result = await getAccessibleDocumentsForAttachmentPaginated(
        page,
        20,
        debouncedSearch,
      );

      if (result.success && result.data) {
        if (replace) {
          setDocuments(result.data.documents);
          setCurrentPage(page);
        } else {
          setDocuments((prev) => [...prev, ...result.data!.documents]);
          setCurrentPage(page);
        }
        setHasMore(page < result.data.pagination.totalPages);
      } else {
        toast.error(result.error || "Failed to load documents");
      }
    } catch (_error) {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchDocuments(currentPage + 1, false);
    }
  };

  const toggleDocument = (documentId: number) => {
    setLocalSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    const selectedDocs = documents.filter((doc) =>
      localSelectedIds.has(doc.id),
    );
    // Include any previously selected documents that aren't in current loaded list
    const previouslySelected = selectedDocuments.filter(
      (doc) =>
        localSelectedIds.has(doc.id) && !documents.find((d) => d.id === doc.id),
    );
    onDocumentsSelected([...selectedDocs, ...previouslySelected]);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Revert to original selection
    const newSelectedIds = new Set(selectedDocuments.map((doc) => doc.id));
    setLocalSelectedIds(newSelectedIds);
    onOpenChange(false);
  };

  const resetState = () => {
    setDocuments([]);
    setCurrentPage(1);
    setSearchQuery("");
    setDebouncedSearch("");
    setLocalSelectedIds(new Set());
    setIsInitialized(false);
    setHasMore(true);
  };

  const formatFileSize = (bytes: string | number | null): string => {
    if (!bytes) return "";
    const size = typeof bytes === "string" ? Number.parseInt(bytes) : bytes;
    if (Number.isNaN(size)) return "";

    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Documents to Attach</DialogTitle>
          <DialogDescription>
            Choose documents from your accessible files to attach to your email
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents by title, filename, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Document List */}
          <ScrollArea className="flex-1 border rounded-md">
            <div className="p-2 space-y-1">
              {loading && documents.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "No documents found matching your search"
                      : "No documents available"}
                  </p>
                </div>
              ) : (
                <>
                  {documents.map((document) => (
                    <div
                      key={document.id}
                      onClick={() => toggleDocument(document.id)}
                      className="flex items-start gap-3 p-3 hover:bg-muted rounded-md cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={localSelectedIds.has(document.id)}
                        onCheckedChange={() => toggleDocument(document.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {document.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                          {document.uploader && (
                            <span>{document.uploader}</span>
                          )}
                          {document.uploader && <span>•</span>}
                          <span>{document.department}</span>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(document.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                      {document.fileSize && (
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatFileSize(document.fileSize)}
                        </div>
                      )}
                    </div>
                  ))}
                  {hasMore && (
                    <LoadMoreButton
                      onClick={handleLoadMore}
                      loading={loading}
                      hasMore={hasMore}
                    />
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {localSelectedIds.size > 0
              ? `${localSelectedIds.size} document${localSelectedIds.size === 1 ? "" : "s"} selected`
              : "No documents selected"}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={localSelectedIds.size === 0}
            >
              Confirm Selection
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
