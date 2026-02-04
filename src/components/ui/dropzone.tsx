/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */

"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type FileRejection, useDropzone } from "react-dropzone";
import { useCallback, useState, useEffect } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import {
  Loader2,
  Trash2,
  Upload,
  File,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";

export interface FileWithMetadata {
  id: string;
  file: File;
  uploading: boolean;
  progress: number;
  key?: string;
  publicUrl?: string;
  isDeleting: boolean;
  error: boolean;
  objectUrl?: string;
}

interface DropzoneProps {
  provider: "aws-s3" | "cloudflare-r2";
  variant?: "default" | "compact" | "minimal" | "avatar" | "inline";
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  onFilesChange?: (files: FileWithMetadata[]) => void;
  className?: string;
  disabled?: boolean;
  helperText?: string;
}

/**
 * Extract key from S3/R2 public URL
 * Example: https://bucket.s3.region.amazonaws.com/key.png -> key.png
 */
export function extractKeyFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1);
  } catch (_error) {
    toast.error("Error extracting key from URL");
    return null;
  }
}

export function Dropzone({
  provider,
  variant = "default",
  accept = {
    "image/*": [],
    "application/pdf": [],
    "application/msword": [],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      [],
    "application/zip": [],
  },
  maxFiles = 5,
  maxSize = 1024 * 1024 * 10, // 10MB
  onFilesChange,
  className,
  disabled = false,
  helperText,
}: DropzoneProps) {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);

  useEffect(() => {
    onFilesChange?.(files);
  }, [files, onFilesChange]);

  const removeFile = async (fileId: string) => {
    try {
      const fileToRemove = files.find((f) => f.id === fileId);
      if (!fileToRemove) return;

      if (fileToRemove.objectUrl) {
        URL.revokeObjectURL(fileToRemove.objectUrl);
      }

      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.id === fileId ? { ...f, isDeleting: true } : f,
        ),
      );

      if (fileToRemove.key && fileToRemove.publicUrl) {
        const endpoint =
          provider === "aws-s3" ? "/api/s3/delete" : "/api/r2/delete";
        const response = await fetch(endpoint, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: fileToRemove.key }),
        });

        if (!response.ok) {
          toast.error("Failed to delete file from server");
          setFiles((prevFiles) =>
            prevFiles.map((f) =>
              f.id === fileId ? { ...f, isDeleting: false, error: true } : f,
            ),
          );
          return;
        }
      }

      setFiles((prevFiles) => prevFiles.filter((f) => f.id !== fileId));
      toast.success("File removed successfully");
    } catch (_error) {
      toast.error("Failed to delete file");
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.id === fileId ? { ...f, isDeleting: false, error: true } : f,
        ),
      );
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length) {
      setFiles((prevFiles) => [
        ...prevFiles,
        ...acceptedFiles.map((file) => ({
          id: uuidv4(),
          file,
          uploading: false,
          progress: 0,
          isDeleting: false,
          error: false,
          objectUrl: URL.createObjectURL(file),
        })),
      ]);

      //acceptedFiles.forEach(uploadFile);
    }
  }, []);

  const onDropRejected = useCallback(
    (fileRejections: FileRejection[]) => {
      if (fileRejections.length) {
        const tooManyFiles = fileRejections.find(
          (rejection) => rejection.errors[0].code === "too-many-files",
        );
        const fileTooLarge = fileRejections.find(
          (rejection) => rejection.errors[0].code === "file-too-large",
        );

        if (tooManyFiles) {
          toast.error(`Too many files. Maximum ${maxFiles} files allowed.`);
        }
        if (fileTooLarge) {
          toast.error(
            `File too large. Maximum ${maxSize / (1024 * 1024)}MB allowed.`,
          );
        }
      }
    },
    [maxFiles, maxSize],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    maxFiles,
    maxSize,
    accept,
    disabled,
    multiple: true,
  });

  const isCompact = variant === "compact";

  return (
    <div className={cn("w-full", className)}>
      <Card
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed transition-colors duration-200 ease-in-out cursor-pointer",
          isCompact ? "h-32" : "h-64",
          isDragActive
            ? "border-primary bg-primary/10 border-solid"
            : "border-border hover:border-primary",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <CardContent className="flex items-center justify-center h-full w-full p-4">
          <input {...getInputProps()} />
          {isDragActive ? (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-primary" />
              <p className="text-center text-sm">Drop the files here...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-2">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                <File className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Drag & drop files here, or click to select
              </p>
              <Button size={isCompact ? "sm" : "default"} type="button">
                Select Files
              </Button>
              {helperText && (
                <p className="text-xs text-muted-foreground text-center">
                  {helperText}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {files.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5 md:grid-cols-7">
          {files.map(
            ({
              id,
              file,
              uploading,
              progress,
              isDeleting,
              error,
              objectUrl,
            }) => {
              const isImage = file.type.startsWith("image/");

              return (
                <div key={id} className="flex flex-col gap-1">
                  <div className="relative w-20 aspect-square rounded-lg overflow-hidden border">
                    {isImage ? (
                      <Image
                        src={objectUrl ?? "image"}
                        width={100}
                        height={100}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <File className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}

                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(id);
                      }}
                      disabled={isDeleting || uploading}
                      type="button"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>

                    {uploading && !isDeleting && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-white font-medium text-lg">
                          {progress}%
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                        <div className="text-white font-medium">Error</div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate px-1">
                    {file.name}
                  </p>
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}

export function useDropzoneCleanup(files: FileWithMetadata[]) {
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.objectUrl) {
          URL.revokeObjectURL(file.objectUrl);
        }
      });
    };
  }, [files]);
}
