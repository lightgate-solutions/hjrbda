/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  MessageSquare,
  FileText,
  Link,
  User,
  Trash2,
  Send,
  Paperclip,
  Loader2,
} from "lucide-react";
import type { BoardTask, StatusType } from "../types";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: BoardTask;
  onStatusChange: (taskId: number, newStatus: StatusType) => void;
  employeeId: number;
  role: "employee" | "manager" | "admin" | "self";
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  senderName: string | null;
  senderEmail: string | null;
}

const statuses: StatusType[] = [
  "Backlog",
  "Todo",
  "In Progress",
  "Review",
  "Completed",
];

const priorityColors: Record<string, string> = {
  Low: "bg-gray-100 text-gray-800",
  Medium: "bg-cyan-100 text-cyan-800",
  High: "bg-red-100 text-red-800",
  Urgent: "bg-pink-100 text-pink-800",
};

export function TaskViewDialog({
  open,
  onOpenChange,
  task,
  onStatusChange,
  employeeId,
  role,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [taskAttachments, setTaskAttachments] = useState(task.attachments);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canDelete = role === "manager" || role === "admin";

  // Sync attachments when task prop changes
  useEffect(() => {
    setTaskAttachments(task.attachments);
  }, [task.attachments]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newAttachments = [...taskAttachments];

    try {
      for (const file of Array.from(files)) {
        // Get presigned URL
        const res = await fetch("/api/r2/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            size: file.size,
          }),
        });

        if (!res.ok) {
          toast.error("Failed to get upload URL");
          continue;
        }

        const { presignedUrl, publicUrl } = await res.json();

        // Upload file to R2
        const uploadRes = await fetch(presignedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (uploadRes.ok) {
          newAttachments.push({ url: publicUrl, name: file.name });
        } else {
          toast.error(`Failed to upload file: ${file.name}`);
        }
      }

      // Only update if we have new attachments
      if (newAttachments.length > taskAttachments.length) {
        // Update task with new attachments
        const updateRes = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId,
            attachments: newAttachments,
          }),
        });

        if (updateRes.ok) {
          setTaskAttachments(newAttachments);
          window.dispatchEvent(new CustomEvent("tasks:changed"));
        } else {
          toast.error("Failed to update task attachments:");
        }
      }
    } catch (_error) {
      toast.error("Error uploading files:");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Employees can change status but not to Completed
  const getAvailableStatuses = () => {
    if (role === "manager" || role === "admin") {
      return statuses;
    }
    // Employees can't set to Completed
    return statuses.filter((s) => s !== "Completed");
  };

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.messages || []);
      }
    } catch (_error) {
      toast.error("Error fetching comments:");
    }
  }, [task.id]);

  useEffect(() => {
    if (open) {
      fetchComments();
    }
  }, [open, fetchComments]);

  const handleSendComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSendingComment(true);
      const res = await fetch(`/api/tasks/${task.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: employeeId,
          content: newComment.trim(),
        }),
      });

      if (res.ok) {
        setNewComment("");
        fetchComments();
      }
    } catch (_error) {
      toast.error("Error sending comment:");
    } finally {
      setSendingComment(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(
        `/api/tasks/${task.id}?employeeId=${employeeId}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        onOpenChange(false);
        window.dispatchEvent(new CustomEvent("tasks:changed"));
      }
    } catch (_error) {
      toast.error("Error deleting task:");
    } finally {
      setDeleting(false);
    }
  };

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No due date";

  const formattedCreatedAt = task.createdAt
    ? new Date(task.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-xl">{task.title}</DialogTitle>
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-red-500">
                    <Trash2 className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Task</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this task? This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select
                value={task.status}
                onValueChange={(value) =>
                  onStatusChange(task.id, value as StatusType)
                }
              >
                <SelectTrigger className="w-[150px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableStatuses().map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Priority:</span>
              <Badge className={cn(priorityColors[task.priority])}>
                {task.priority}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Description</h4>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                {task.description}
              </p>
            </div>
          )}

          {/* Labels */}
          {task.labels.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Labels</h4>
              <div className="flex flex-wrap gap-2">
                {task.labels.map((label) => (
                  <Badge
                    key={label.id}
                    variant="secondary"
                    className={cn(label.color)}
                  >
                    {label.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Due:</span>
              <span>{formattedDueDate}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span>{formattedCreatedAt}</span>
            </div>

            {task.attachments.length > 0 && (
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <span>{task.attachments.length} attachments</span>
              </div>
            )}

            {task.links.length > 0 && (
              <div className="flex items-center gap-2">
                <Link className="size-4 text-muted-foreground" />
                <span>{task.links.length} links</span>
              </div>
            )}
          </div>

          {/* Progress */}
          {task.progressTotal > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Progress</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${(task.progressCompleted / task.progressTotal) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  {task.progressCompleted}/{task.progressTotal}
                </span>
              </div>
            </div>
          )}

          {/* Assignees */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Assignees</h4>
            {task.assignees.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2"
                  >
                    <Avatar className="size-6">
                      <AvatarImage src={user.avatar || ""} />
                      <AvatarFallback>
                        {user.name
                          ? user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No assignees</p>
            )}
          </div>

          {/* Assigned By */}
          {task.assignedBy && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Assigned By</h4>
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 w-fit">
                <User className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{task.assignedBy.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.assignedBy.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Attachments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Attachments</h4>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="task-view-attachments"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Paperclip className="size-4 mr-2" />
                      Add Files
                    </>
                  )}
                </Button>
              </div>
            </div>
            {taskAttachments.length > 0 ? (
              <div className="space-y-1">
                {taskAttachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
                  >
                    <FileText className="size-4" />
                    {att.name}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No attachments</p>
            )}
          </div>

          {/* Links */}
          {task.links.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Links</h4>
              <div className="space-y-1">
                {task.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
                  >
                    <Link className="size-4" />
                    {link.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="size-4" />
              Comments ({comments.length})
            </h4>

            {/* Comment List */}
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-muted rounded-lg p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {comment.senderName || comment.senderEmail}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* New Comment Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="resize-none"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
              />
              <Button
                size="icon"
                onClick={handleSendComment}
                disabled={!newComment.trim() || sendingComment}
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
