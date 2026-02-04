/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X, Paperclip } from "lucide-react";
import { toast } from "sonner";
import type { NewsArticle } from "@/actions/news/news";
import { createNewsArticle, updateNewsArticle } from "@/actions/news/news";
import axios from "axios";

interface NewsFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  article?: NewsArticle | null;
}

interface Attachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export function NewsFormDialog({
  open,
  onClose,
  onSuccess,
  article,
}: NewsFormDialogProps) {
  const isEditing = !!article;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(article?.title || "");
  const [content, setContent] = useState(article?.content || "");
  const [excerpt, setExcerpt] = useState(article?.excerpt || "");
  const [status, setStatus] = useState<"draft" | "published" | "archived">(
    article?.status || "draft",
  );
  const [commentsEnabled, setCommentsEnabled] = useState(
    article?.commentsEnabled ?? true,
  );
  const [isPinned, setIsPinned] = useState(article?.isPinned ?? false);
  const [attachments, setAttachments] = useState<Attachment[]>(
    article?.attachments || [],
  );
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setTitle("");
    setContent("");
    setExcerpt("");
    setStatus("draft");
    setCommentsEnabled(true);
    setIsPinned(false);
    setAttachments([]);
  }, []);

  // Sync state when article changes
  useEffect(() => {
    if (article) {
      setTitle(article.title || "");
      setContent(article.content || "");
      setExcerpt(article.excerpt || "");
      setStatus(article.status || "draft");
      setCommentsEnabled(article.commentsEnabled ?? true);
      setIsPinned(article.isPinned ?? false);
      setAttachments(article.attachments || []);
    } else {
      resetForm();
    }
  }, [article, resetForm]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newAttachments: Attachment[] = [];

    try {
      for (const file of Array.from(files)) {
        const { data } = await axios.post("/api/r2/upload", {
          filename: file.name,
          contentType: file.type,
          size: file.size,
        });

        const { presignedUrl, publicUrl } = data;

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", presignedUrl, true);
          xhr.setRequestHeader("Content-Type", file.type);

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.send(file);
        });

        newAttachments.push({
          fileName: file.name,
          fileUrl: publicUrl,
          fileSize: file.size,
          mimeType: file.type,
        });
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
      toast.success(`${newAttachments.length} file(s) uploaded`);
    } catch (_err) {
      toast.error("Failed to upload file(s)");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() || undefined,
        status,
        commentsEnabled,
        isPinned,
        attachments,
      };

      let result: any;
      if (isEditing && article) {
        result = await updateNewsArticle({ ...data, id: article.id });
      } else {
        // Create doesn't allow "archived" status, default to "draft"
        const createData = {
          ...data,
          status: (data.status === "archived" ? "draft" : data.status) as
            | "draft"
            | "published",
        };
        result = await createNewsArticle(createData);
      }

      if (result.success) {
        toast.success(result.success.reason);
        resetForm();
        onSuccess();
      } else {
        toast.error(result.error?.reason || "Operation failed");
      }
    } catch (_err) {
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit News Article" : "Create News Article"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter article title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Input
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief summary (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your article content..."
              className="min-h-[200px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as typeof status)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                {isEditing && (
                  <SelectItem value="archived">Archived</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="comments">Enable Comments</Label>
            <Switch
              id="comments"
              checked={commentsEnabled}
              onCheckedChange={setCommentsEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="pinned">Pin Article</Label>
            <Switch
              id="pinned"
              checked={isPinned}
              onCheckedChange={setIsPinned}
            />
          </div>

          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="border rounded-lg p-4 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </>
                )}
              </Button>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((att, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip className="h-4 w-4 flex-shrink-0" />
                        <div className="overflow-hidden">
                          <p className="text-sm truncate">{att.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(att.fileSize)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAttachment(index)}
                        className="h-8 w-8 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Update" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
