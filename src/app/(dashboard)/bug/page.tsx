"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Bug } from "lucide-react";
import {
  Dropzone,
  type FileWithMetadata,
  useDropzoneCleanup,
} from "@/components/ui/dropzone";

const bugReportSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  title: z.string().min(1, "Title is required"),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().min(10, "Description must be at least 10 characters"),
  stepsToReproduce: z.string().optional(),
});

type BugReportForm = z.infer<typeof bugReportSchema>;

export default function BugReportPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<FileWithMetadata[]>([]);

  useDropzoneCleanup(files);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<BugReportForm>({
    resolver: zodResolver(bugReportSchema),
    defaultValues: {
      severity: "medium",
    },
  });

  const onSubmit = async (data: BugReportForm) => {
    setIsSubmitting(true);
    try {
      // Upload files to R2 if any
      const uploadedFiles: {
        originalFileName: string;
        filePath: string;
        fileSize: string;
        mimeType: string;
      }[] = [];

      for (const fileWithMetadata of files) {
        const { file } = fileWithMetadata;

        // Get presigned URL
        const uploadResponse = await fetch("/api/r2/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            size: file.size,
          }),
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { presignedUrl, publicUrl } = await uploadResponse.json();

        // Upload file to R2
        const uploadFileResponse = await fetch(presignedUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadFileResponse.ok) {
          throw new Error("Failed to upload file");
        }

        uploadedFiles.push({
          originalFileName: file.name,
          filePath: publicUrl,
          fileSize: file.size.toString(),
          mimeType: file.type,
        });
      }

      // Submit bug report with attachments
      const response = await fetch("/api/bug-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          attachments: uploadedFiles,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit bug report");
      }

      toast.success("Bug report submitted successfully!");
      reset();
      setFiles([]);
    } catch {
      toast.error("Failed to submit bug report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-6 w-6" />
            Report a Bug or Give Feedback
          </CardTitle>
          <CardDescription>
            Found an issue or have a suggestion for us? Help us improve the
            application's experience by reporting it below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name *</Label>
                <Input id="name" placeholder="John Doe" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Your Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Brief description of the issue or feedback"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                defaultValue="medium"
                onValueChange={(value) =>
                  setValue("severity", value as BugReportForm["severity"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              {errors.severity && (
                <p className="text-sm text-red-500">
                  {errors.severity.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the issue or feedback in detail..."
                rows={4}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-red-500">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stepsToReproduce">
                Steps to Reproduce (Optional)
              </Label>
              <Textarea
                id="stepsToReproduce"
                placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                rows={4}
                {...register("stepsToReproduce")}
              />
            </div>

            <div className="space-y-2">
              <Label>Attachments (Optional)</Label>
              <Dropzone
                provider="cloudflare-r2"
                variant="compact"
                maxFiles={5}
                maxSize={1024 * 1024 * 10}
                onFilesChange={setFiles}
                disabled={isSubmitting}
                helperText="Upload screenshots or files (Max 10MB per file, up to 5 files)"
                accept={{
                  "image/*": [],
                  "application/pdf": [],
                  "application/msword": [],
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                    [],
                  "video/*": [],
                }}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
