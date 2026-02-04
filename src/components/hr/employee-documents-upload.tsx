/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
// biome-ignore-all lint/style/noNonNullAssertion: <>

"use client";
import { Dropzone, type FileWithMetadata } from "@/components/ui/dropzone";
import { useState } from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { CheckCircle, PlusIcon } from "lucide-react";
import { Progress } from "../ui/progress";
import { Spinner } from "../ui/spinner";
import { uploadEmployeeDocumentAction } from "@/actions/hr/employee-documents";

const documentTypes = [
  { label: "Resume/CV", value: "resume" },
  { label: "ID Card", value: "id_card" },
  { label: "Passport", value: "passport" },
  { label: "Contract", value: "contract" },
  { label: "Certification", value: "certification" },
  { label: "Visa", value: "visa" },
  { label: "Work Permit", value: "work_permit" },
  { label: "Other", value: "other" },
] as const;

const uploadSchema = z.object({
  documentType: z.string().min(1, "Please select a document type"),
  documentName: z
    .string()
    .min(3, "Document name must be at least 3 characters")
    .max(50, "Document name must be at most 50 characters"),
});

export default function EmployeeDocumentsUpload({
  employeeId,
  onSuccess,
}: {
  employeeId: number;
  onSuccess?: () => void;
}) {
  const [files, setFiles] = useState<FileWithMetadata[]>();
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      documentType: "",
      documentName: "",
    },
  });

  const uploadFile = async (file: File): Promise<string | null | undefined> => {
    setFiles((prevFiles) =>
      prevFiles?.map((f) => (f.file === file ? { ...f, uploading: true } : f)),
    );

    setProgress(30);
    try {
      const endpoint = "/api/r2/upload";
      const presignedResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      setProgress(40);
      if (!presignedResponse.ok) {
        toast.error("Failed to get presigned URL");
        setFiles((prevFiles) =>
          prevFiles?.map((f) =>
            f.file === file
              ? { ...f, uploading: false, progress: 0, error: true }
              : f,
          ),
        );
        return null;
      }

      setProgress(50);
      const { presignedUrl, key, publicUrl } = await presignedResponse.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        setProgress(70);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setFiles((prevFiles) =>
              prevFiles?.map((f) =>
                f.file === file
                  ? {
                      ...f,
                      progress: Math.round(percentComplete),
                      key: key,
                      publicUrl: publicUrl,
                    }
                  : f,
              ),
            );
          }
        };

        setProgress(90);
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 204) {
            setFiles((prevFiles) =>
              prevFiles?.map((f) =>
                f.file === file
                  ? { ...f, progress: 100, uploading: false, error: false }
                  : f,
              ),
            );
            resolve();
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Upload failed"));
        };

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
      setProgress(100);
      const url = process.env.CLOUDFLARE_R2_PUBLIC_URL!;
      return publicUrl ?? `${url}/${encodeURIComponent(key)}`;
    } catch (_error) {
      toast.error("Upload failed");
      setFiles((prevFiles) =>
        prevFiles?.map((f) =>
          f.file === file
            ? { ...f, uploading: false, progress: 0, error: true }
            : f,
        ),
      );
      return null;
    }
  };

  async function onSubmit(data: z.infer<typeof uploadSchema>) {
    setIsUploading(true);
    setProgress(0);

    try {
      if (!files || files?.length <= 0) {
        toast.error("No file selected");
        setIsUploading(false);
        return;
      }

      if (files.length > 1) {
        toast.error("Please upload only one file at a time");
        setIsUploading(false);
        return;
      }

      setProgress(10);
      const file = files[0];
      const url = await uploadFile(file.file);

      if (!url) {
        toast.error("Failed to upload file");
        setIsUploading(false);
        return;
      }

      const fileSizeMB = (file.file.size / (1024 * 1024)).toFixed(2);

      const result = await uploadEmployeeDocumentAction({
        employeeId,
        documentType: data.documentType,
        documentName: data.documentName,
        filePath: url,
        fileSize: fileSizeMB,
        mimeType: file.file.type,
        pathname: window.location.pathname,
      });

      if (result.success) {
        toast.success("Document uploaded successfully");
        form.reset();
        setFiles(undefined);
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error?.reason || "Failed to upload document");
      }
    } catch (_error) {
      toast.error("Upload failed. Try again!");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form
      id="form-upload-employee-document"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <DialogTrigger asChild>
        <Button className="hover:cursor-pointer" size="sm">
          <PlusIcon className="mr-1 h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[35rem] sm:min-w-[35rem] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Employee Document</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <div className="grid gap-4 py-4">
            <Controller
              name="documentName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldContent>
                    <FieldLabel htmlFor="documentName">
                      Document Name *
                    </FieldLabel>
                    <Input
                      {...field}
                      name="documentName"
                      aria-invalid={fieldState.invalid}
                      placeholder="Employee Contract 2025"
                      autoComplete="off"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                    <FieldDescription>
                      Enter a descriptive name for this document
                    </FieldDescription>
                  </FieldContent>
                </Field>
              )}
            />

            <Controller
              name="documentType"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  orientation="responsive"
                  data-invalid={fieldState.invalid}
                >
                  <FieldContent>
                    <FieldLabel htmlFor="documentType">
                      Document Type *
                    </FieldLabel>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        name="documentType"
                        aria-invalid={fieldState.invalid}
                        className="w-full"
                      >
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent position="item-aligned">
                        {documentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Select the type of document you are uploading
                    </FieldDescription>
                  </FieldContent>
                </Field>
              )}
            />

            <FieldSet>
              <FieldLabel>Upload File *</FieldLabel>
              <FieldDescription>
                Upload a document file (PDF, DOCX, JPG, PNG, etc.)
              </FieldDescription>
              <Dropzone
                provider="cloudflare-r2"
                variant="compact"
                maxFiles={1}
                maxSize={1024 * 1024 * 10} // 10MB
                onFilesChange={(files) => setFiles(files)}
              />
            </FieldSet>
          </div>
        </FieldGroup>

        <div>
          <Field orientation="horizontal">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                setFiles(undefined);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading}
              form="form-upload-employee-document"
            >
              {isUploading && <Spinner />}
              {!isUploading ? "Upload" : "Uploading..."}
            </Button>
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {progress < 100
                      ? "Uploading document..."
                      : "Upload complete!"}
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {progress === 100 && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
            )}
          </Field>
        </div>
      </DialogContent>
    </form>
  );
}
