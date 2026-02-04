"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time";
import { Label } from "@/components/ui/label";
import { Paperclip, X, FileText, Loader2 } from "lucide-react";
import type { StatusType } from "../types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: StatusType;
  employeeId: number;
  role?: "employee" | "manager" | "admin" | "self";
}

const TaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  status: z
    .enum(["Backlog", "Todo", "In Progress", "Review", "Completed"])
    .optional(),
  dueDate: z.preprocess((v) => (v instanceof Date ? v : undefined), z.date()),
  assignees: z.array(z.number()).min(1, "Select at least one employee"),
  assignedBy: z.number().optional(),
  attachments: z
    .array(z.object({ url: z.string(), name: z.string() }))
    .optional(),
});

type TaskInput = z.infer<typeof TaskSchema>;
type FormErrors = Partial<Record<keyof TaskInput, string>>;

interface Attachment {
  url: string;
  name: string;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  defaultStatus = "Todo",
  employeeId,
  role,
}: Props) {
  const [date, setDate] = useState<Date | undefined>();
  const [info, setInfo] = useState({
    title: "",
    description: "",
    priority: "Medium" as TaskInput["priority"],
    status: defaultStatus as TaskInput["status"],
    dueDate: undefined as Date | undefined,
    assignees: [] as number[],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [assignees, setAssignees] = useState<number[]>([]);
  const [subordinates, setSubordinates] = useState<
    Array<{ id: number; name: string; email: string; department: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSubordinates = useCallback(async () => {
    if (!employeeId || role === "self") return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/hr/employees/subordinates?employeeId=${employeeId}`,
      );
      const data = await response.json();
      setSubordinates(data.subordinates || []);
    } finally {
      setLoading(false);
    }
  }, [employeeId, role]);

  useEffect(() => {
    if (open) {
      if (role === "self") {
        setAssignees([employeeId]);
        setInfo((prev) => ({ ...prev, assignees: [employeeId] }));
      } else {
        fetchSubordinates();
      }
    }
  }, [open, fetchSubordinates, role, employeeId]);

  useEffect(() => {
    setInfo((prev) => ({ ...prev, status: defaultStatus }));
  }, [defaultStatus]);

  const addAssignee = (id: number) => {
    setAssignees((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      setInfo((pi) => ({ ...pi, assignees: next }));
      setErrors((e) => ({ ...e, assignees: undefined }));
      return next;
    });
  };

  const removeAssignee = (id: number) => {
    setAssignees((prev) => {
      const next = prev.filter((x) => x !== id);
      setInfo((pi) => ({ ...pi, assignees: next }));
      return next;
    });
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
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
          setAttachments((prev) => [
            ...prev,
            { url: publicUrl, name: file.name },
          ]);
        } else {
          toast.error(`Failed to upload file: ${file.name}`);
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

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedAssignees = subordinates.filter((s) =>
    assignees.includes(s.id),
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setLoading(true);
      const payload: Partial<TaskInput> = {
        ...info,
        dueDate: info.dueDate,
        assignedBy: employeeId,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      const result = TaskSchema.safeParse(payload);
      if (!result.success) {
        const fieldErrors: FormErrors = {};
        for (const issue of result.error.issues) {
          const key = issue.path[0] as keyof TaskInput | undefined;
          if (key) {
            if (key === "assignees") {
              fieldErrors[key] = "Select at least one employee";
            } else if (key === "dueDate") {
              fieldErrors[key] = "Due date is required";
            } else {
              fieldErrors[key] = issue.message;
            }
          }
        }
        setErrors(fieldErrors);
        return;
      }

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...result.data }),
      });

      if (!response.ok) {
        const data = await response.json();
        setErrors({
          assignees: data.error || "Failed to create task",
        });
        return;
      }

      // Success
      setErrors({});
      setInfo({
        title: "",
        description: "",
        priority: "Medium",
        status: defaultStatus,
        dueDate: undefined,
        assignees: [],
      });
      setAssignees([]);
      setDate(undefined);
      setAttachments([]);
      onOpenChange(false);
      window.dispatchEvent(new CustomEvent("tasks:changed"));
    } catch (_error) {
      toast.error("Error creating task:");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              placeholder="Enter task title..."
              value={info.title}
              onChange={(e) => {
                setInfo({ ...info, title: e.target.value });
                setErrors((er) => ({ ...er, title: undefined }));
              }}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={info.priority}
                onValueChange={(value) => {
                  setInfo({
                    ...info,
                    priority: value as TaskInput["priority"],
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={info.status}
                onValueChange={(value) => {
                  setInfo({
                    ...info,
                    status: value as TaskInput["status"],
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Backlog">Backlog</SelectItem>
                  <SelectItem value="Todo">Todo</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Review">Review</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date *</Label>
            <DateTimePicker
              date={date}
              setDate={(d) => {
                setDate(d);
                setInfo({ ...info, dueDate: d ?? undefined });
                setErrors((er) => ({ ...er, dueDate: undefined }));
              }}
            />
            {errors.dueDate && (
              <p className="text-sm text-red-500">{errors.dueDate}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the task..."
              className="resize-none"
              rows={3}
              value={info.description}
              onChange={(e) => {
                setInfo({ ...info, description: e.target.value });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="task-attachments"
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
            {attachments.length > 0 && (
              <div className="space-y-1 mt-2">
                {attachments.map((att, idx) => (
                  <div
                    key={`${att.name}-${idx}`}
                    className="flex items-center justify-between rounded border px-2 py-1 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">{att.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() => removeAttachment(idx)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {role !== "self" && (
            <div className="space-y-2">
              <Label>Assign Employees *</Label>
              {errors.assignees && (
                <p className="text-sm text-red-500">{errors.assignees}</p>
              )}
              <Select onValueChange={(val) => addAssignee(Number(val))}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={loading ? "Loading..." : "Add employee"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {subordinates.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} ({s.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedAssignees.length > 0 && (
                <div className="mt-2 space-y-1">
                  {selectedAssignees.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded border px-2 py-1 text-sm"
                    >
                      <span>{s.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={() => removeAssignee(s.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
