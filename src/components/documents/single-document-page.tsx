/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */
// biome-ignore-all lint/style/noNonNullAssertion: <>
"use client";

import {
  Archive,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Edit2,
  Eye,
  FileIcon,
  ImagePlay,
  MoreVertical,
  Settings,
  Share,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "next/navigation";
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
import { ButtonGroup } from "@/components/ui/button-group";
import {
  archiveDocumentAction,
  deleteDocumentAction,
  addDocumentComment,
  deleteDocumentVersion,
  addDocumentShare,
  removeDocumentShare,
  updateDocumentPublic,
  updateDepartmentAccess,
} from "@/actions/documents/documents";
import {
  useDocumentComments,
  useDocumentVersions,
  useDocumentLogs,
  useDocumentShares,
  useDocumentAccess,
  useSearchEmployees,
} from "@/hooks/documents";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import {
  DocumentCommentsSkeleton,
  DocumentVersionsSkeleton,
  DocumentLogsSkeleton,
  DocumentSharesSkeleton,
} from "@/components/skeletons/documents";
import { ErrorBoundary } from "@/components/error-boundary";
import { QueryError } from "@/components/query-error";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Dropzone, type FileWithMetadata } from "../ui/dropzone";
import { useState } from "react";
import { uploadNewDocumentVersion } from "@/actions/documents/upload";
import { Spinner } from "../ui/spinner";
import { Progress } from "../ui/progress";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";

export type DocumentType = {
  id: number;
  title: string;
  description: string | null;
  public: boolean | null;
  departmental: boolean | null;
  department: string;
  status: string;
  filePath: string | null;
  fileSize: string | null;
  mimeType: string | null;
  createdAt: Date;
  updatedAt: Date;
  currentVersion: number;
  uploader: string | null;
  uploaderId: number | null;
  uploaderEmail: string | null;
  loggedUser: unknown;
  tags: string[];
  accessRules: {
    accessLevel: string;
    userId: number | null;
    name: string | null;
    email: string | null;
    department: string | null;
  }[];
};

export default function SingleDocumentPage({ doc }: { doc: DocumentType }) {
  const pathname = usePathname();

  return (
    <ErrorBoundary>
      <DocumentPage doc={doc} pathname={pathname} />
    </ErrorBoundary>
  );
}

function DocumentPage({
  doc,
  pathname,
}: {
  doc: DocumentType;
  pathname: string;
}) {
  const [files, setFiles] = useState<FileWithMetadata[]>();
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("overview");
  const [commentText, setCommentText] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareLevel, setShareLevel] = useState<"view" | "edit" | "manage">(
    "view",
  );

  const queryClient = useQueryClient();

  // React Query hooks with conditional enabling based on active tab
  const { data: myAccess, error: _accessError } = useDocumentAccess(doc.id);
  const {
    data: comments = [],
    isLoading: commentsLoading,
    error: commentsError,
    refetch: refetchComments,
  } = useDocumentComments(doc.id, activeTab === "comment");
  const {
    data: versions = [],
    isLoading: versionsLoading,
    error: versionsError,
    refetch: refetchVersions,
  } = useDocumentVersions(doc.id, activeTab === "versions");
  const {
    data: logs = [],
    isLoading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useDocumentLogs(doc.id, activeTab === "history");
  const {
    data: shares = [],
    isLoading: sharesLoading,
    error: _sharesError,
    refetch: _refetchShares,
  } = useDocumentShares(
    doc.id,
    (myAccess?.isOwner || myAccess?.isAdminDepartment || false) &&
      activeTab === "permissions",
  );

  // Debounced search for employee suggestions
  const [debouncedSearchEmail] = useDebounce(shareEmail, 300);
  const { data: shareSuggestions = [], isLoading: shareSuggestionsLoading } =
    useSearchEmployees(
      debouncedSearchEmail,
      8,
      debouncedSearchEmail.length >= 2,
    );

  const [publicValue, setPublicValue] = useState(!!doc.public);
  const [pubUpdating, setPubUpdating] = useState(false);
  const initialDeptLevel =
    (doc.accessRules.find(
      (r: any) => r.department && r.department === doc.department,
    )?.accessLevel as "view" | "edit" | "manage") ?? "view";
  const [deptEnabled, setDeptEnabled] = useState(!!doc.departmental);
  const [deptLevel, setDeptLevel] = useState<"view" | "edit" | "manage">(
    initialDeptLevel,
  );
  const [deptUpdating, setDeptUpdating] = useState(false);

  async function handleShareAdd() {
    const email = shareEmail.trim();
    if (!email) return;
    const res = await addDocumentShare(doc.id, email, shareLevel);
    if (res.success) {
      toast.success(res.success.reason);
      setShareEmail("");
      // Invalidate shares query to refetch
      await queryClient.invalidateQueries({
        queryKey: ["document-shares", doc.id],
      });
    } else {
      toast.error(res.error?.reason ?? "Failed to add share");
    }
  }

  async function handleShareRemove(userId: number) {
    const res = await removeDocumentShare(doc.id, userId);
    if (res.success) {
      toast.success(res.success.reason);
      // Invalidate shares query to refetch
      await queryClient.invalidateQueries({
        queryKey: ["document-shares", doc.id],
      });
    } else {
      toast.error(res.error?.reason ?? "Failed to remove share");
    }
  }

  async function handleAddComment() {
    const text = commentText.trim();
    if (!text) return;
    const res = await addDocumentComment(doc.id, text);
    if (res.success) {
      setCommentText("");
      toast.success("Comment added");
      // Invalidate comments query to refetch
      await queryClient.invalidateQueries({
        queryKey: ["document-comments", doc.id],
      });
      router.refresh();
    } else {
      toast.error(res.error?.reason ?? "Failed to add comment");
    }
  }

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
    } catch (error) {
      console.error(error);
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

  async function onSubmit() {
    setIsUploading(true);
    setProgress(0);

    try {
      if (!files || files?.length <= 0) {
        toast.error("No file selected");
        return;
      }

      setProgress(10);

      setProgress(20);
      const url = await uploadFile(files[0].file);
      if (!url) throw new Error("File upload failed. No URL returned.");
      const fileSizeMB = (files[0].file.size / (1024 * 1024)).toFixed(2);

      const res = await uploadNewDocumentVersion({
        id: doc.id,
        newVersionNumber: doc.currentVersion + 1,
        url: url,
        fileSize: fileSizeMB,
        mimeType: files[0].file.type,
        pathname,
      });
      if (res.success) {
        toast.success("New file version uploaded succesfully");
        router.refresh();
      } else {
        toast.error(res.error?.reason);
      }
    } catch (_error) {
      toast.error("Upload failed. Try again!");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <div className="min-w-3xl 2xl:min-w-4xl">
        <div className="space-y-6 pb-6">
          <div className="flex flex-row gap-3">
            <div className="bg-muted p-4 rounded-xl">
              <FileIcon size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {doc.title.charAt(0).toUpperCase() + doc.title.slice(1)}
              </h2>
              <div className="text-muted-foreground">
                {doc.description ?? "No description available"}
              </div>
              <div className="text-muted-foreground text-sm">
                {doc.fileSize} MB • Modified{" "}
                {new Date(doc.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div>
            <ButtonGroup>
              <ButtonGroup>
                <Link
                  target="_blank"
                  href={doc.filePath ?? ""}
                  className="hover:cursor-pointer"
                >
                  <Button variant="outline">
                    <Eye />
                    Open
                  </Button>
                </Link>
              </ButtonGroup>
              <ButtonGroup>
                <Button
                  onClick={() => {
                    const url = doc.filePath ?? "";
                    if (!url) return;
                    try {
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    } catch {
                      window.open(url, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  <Download />
                  Download
                </Button>
              </ButtonGroup>
              <ButtonGroup>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Share />
                      Share
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Share document</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="user@example.com"
                          value={shareEmail}
                          onChange={(e) => setShareEmail(e.target.value)}
                        />
                        <select
                          className="border rounded px-2 text-sm"
                          value={shareLevel}
                          onChange={(e) =>
                            setShareLevel(
                              e.target.value as "view" | "edit" | "manage",
                            )
                          }
                        >
                          <option value="view">View</option>
                          <option value="edit">Edit</option>
                          <option value="manage">Manage</option>
                        </select>
                        <Button onClick={handleShareAdd}>Add</Button>
                      </div>

                      {shareSuggestionsLoading && (
                        <div className="text-xs text-muted-foreground">
                          Searching…
                        </div>
                      )}
                      {shareSuggestions.length > 0 && (
                        <div className="border rounded p-2 max-h-40 overflow-y-auto">
                          {shareSuggestions.map((s: any) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between py-1 hover:bg-muted/50 px-2 rounded cursor-pointer"
                              onClick={() => setShareEmail(s.email)}
                            >
                              <div className="text-sm">
                                {s.name} •{" "}
                                <span className="text-muted-foreground">
                                  {s.email}
                                </span>
                              </div>
                              <Badge variant="outline">{s.department}</Badge>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          Current shares
                        </div>
                        {sharesLoading ? (
                          <DocumentSharesSkeleton />
                        ) : shares.length === 0 ? (
                          <div className="text-xs text-muted-foreground">
                            No shares yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {shares.map((u: any) => (
                              <div
                                key={u.userId}
                                className="flex items-center justify-between border rounded p-2"
                              >
                                <div className="text-sm">
                                  {u.name ?? "User"} •{" "}
                                  <span className="text-muted-foreground">
                                    {u.email}
                                  </span>{" "}
                                  • {u.accessLevel}
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleShareRemove(u.userId)}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </ButtonGroup>
              <ButtonGroup>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Edit2 />
                      New Version
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle></DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        onSubmit();
                      }}
                      className="space-y-6"
                    >
                      <Dropzone
                        provider="cloudflare-r2"
                        variant="compact"
                        maxFiles={10}
                        maxSize={1024 * 1024 * 50} // 50MB
                        onFilesChange={(files) => setFiles(files)}
                      />
                      <Button type="submit" disabled={isUploading}>
                        {isUploading && <Spinner />}
                        {!isUploading ? "Submit" : "Uploading..."}
                      </Button>
                      {isUploading && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {progress < 100
                                ? "Uploading document.pdf..."
                                : "Upload complete!"}
                            </span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="w-full" />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            {progress > 100 && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </div>
                      )}
                    </form>
                  </DialogContent>
                </Dialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="px-2 bg-transparent">
                      <MoreVertical size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="space-y-1">
                    <DropdownMenuItem className="hover:cursor-pointer " asChild>
                      <DocumentsActions
                        type="archive"
                        id={doc.id}
                        pathname={pathname}
                      />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 hover:cursor-pointer"
                      asChild
                    >
                      <DocumentsActions
                        type="delete"
                        id={doc.id}
                        pathname={pathname}
                      />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>
            </ButtonGroup>
          </div>
        </div>

        <Separator />

        <div className="flex px-4 py-4 overflow-y-auto w-full flex-col gap-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="comment">Comments</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              {(myAccess?.isOwner || myAccess?.level === "manage") && (
                <TabsTrigger value="history">History</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Document Information</CardTitle>
                </CardHeader>
                <CardContent className="">
                  <div className="grid grid-cols-2">
                    <div className=" flex flex-col gap-2">
                      <div className="flex gap-3 ">
                        <div className="flex text-muted-foreground justify-center items-center">
                          <Calendar size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span>Created</span>
                          <span className="text-sm text-muted-foreground">
                            {doc.createdAt.toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 ">
                        <div className="flex text-muted-foreground justify-center items-center">
                          <Clock size={18} />
                        </div>
                        <div className="flex flex-col ">
                          <span>Last Modified</span>
                          <span className="text-sm text-muted-foreground">
                            {doc.updatedAt.toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 ">
                        <div className="flex text-muted-foreground justify-center items-center">
                          <User size={18} />
                        </div>
                        <div className="flex flex-col ">
                          <span>Owner</span>
                          <span className="text-sm text-muted-foreground">
                            {doc.uploader}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 ">
                        <div className="flex text-muted-foreground justify-center items-center">
                          <Settings size={18} />
                        </div>
                        <div className="flex flex-col ">
                          <span>Version</span>
                          <span className="text-sm text-muted-foreground">
                            V{doc.currentVersion}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 ">
                        <div className="flex text-muted-foreground justify-center items-center">
                          <ImagePlay size={18} />
                        </div>
                        <div className="flex flex-col ">
                          <span>Document Type</span>
                          <span className="text-sm text-muted-foreground">
                            {doc.mimeType}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className=" flex flex-col gap-4">
                      <div>
                        <div>Tags</div>
                        <div className="flex gap-3">
                          {doc.tags.map((tag, idx) => (
                            <div
                              key={idx}
                              className="rounded-full bg-teal-200 p-1 text-xs px-3"
                            >
                              {tag}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comment">
              <Card>
                <CardHeader>
                  <CardTitle>Comments</CardTitle>
                  <CardDescription>
                    comments relating to this document
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  {(myAccess?.isOwner ||
                    myAccess?.level === "edit" ||
                    myAccess?.level === "manage") && (
                    <div className="space-y-2">
                      <Label htmlFor={`comment-${doc.id}`}>Add a comment</Label>
                      <Textarea
                        id={`comment-${doc.id}`}
                        placeholder="Write your comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={3}
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleAddComment}
                          disabled={!commentText.trim()}
                        >
                          Post comment
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    {commentsLoading ? (
                      <DocumentCommentsSkeleton />
                    ) : commentsError ? (
                      <QueryError
                        error={commentsError as Error}
                        onRetry={() => refetchComments()}
                        title="Failed to load comments"
                      />
                    ) : comments.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No comments yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {comments.map((c, idx) => (
                          <div key={idx} className="p-3 rounded-md border">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">
                                {c.userName ?? "User"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(c.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-sm mt-2">{c.comment}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="versions">
              <Card>
                <CardHeader>
                  <CardTitle>Versions</CardTitle>
                  <CardDescription>All past versions</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  {versionsLoading ? (
                    <DocumentVersionsSkeleton />
                  ) : versionsError ? (
                    <QueryError
                      error={versionsError as Error}
                      onRetry={() => refetchVersions()}
                      title="Failed to load versions"
                    />
                  ) : versions.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No previous versions.
                    </div>
                  ) : (
                    versions.map((v) => {
                      const isCurrent =
                        v.versionNumber === doc.currentVersion.toString();
                      return (
                        <div
                          key={v.id}
                          className="flex items-center justify-between border rounded-md p-3"
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                v{v.versionNumber}
                              </span>
                              {isCurrent && (
                                <Badge variant="secondary">Current</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(v.createdAt).toLocaleString()} •{" "}
                              {v.fileSize} MB • {v.mimeType}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Uploaded by {v.uploadedByName ?? "User"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const url = v.filePath ?? "";
                                if (!url) return;
                                try {
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `${doc.title}-v${v.versionNumber}`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                } catch {
                                  window.open(
                                    url,
                                    "_blank",
                                    "noopener,noreferrer",
                                  );
                                }
                              }}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isCurrent}
                              onClick={async () => {
                                const res = await deleteDocumentVersion(
                                  v.id,
                                  pathname,
                                );
                                if (res?.success) {
                                  toast.success(res.success.reason);
                                  await queryClient.invalidateQueries({
                                    queryKey: ["document-versions", doc.id],
                                  });
                                  router.refresh();
                                } else {
                                  toast.error(
                                    res?.error?.reason ??
                                      "Failed to delete version",
                                  );
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions">
              <Card>
                <CardHeader>
                  <CardTitle>Permissions</CardTitle>
                  <CardDescription>
                    View and manage document access
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  {!myAccess ? (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Load your permissions to manage access
                      </div>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          await queryClient.invalidateQueries({
                            queryKey: ["document-access", doc.id],
                          });
                          await queryClient.invalidateQueries({
                            queryKey: ["document-shares", doc.id],
                          });
                        }}
                      >
                        Refresh
                      </Button>
                    </div>
                  ) : myAccess.isOwner || myAccess.isAdminDepartment ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border rounded-md p-3">
                          <div className="text-sm font-medium mb-1">
                            Uploader
                          </div>
                          <div className="text-sm">
                            {doc.uploader} •{" "}
                            <Badge variant="secondary">Manage</Badge>
                          </div>
                        </div>

                        <div className="border rounded-md p-3">
                          <div className="text-sm font-medium mb-1">
                            Public access
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              {publicValue
                                ? "Document is public"
                                : "Not public"}
                            </div>
                            <Button
                              variant="outline"
                              disabled={pubUpdating}
                              onClick={async () => {
                                try {
                                  setPubUpdating(true);
                                  const next = !publicValue;
                                  const res = await updateDocumentPublic(
                                    doc.id,
                                    next,
                                    pathname,
                                  );
                                  if (res?.success) {
                                    setPublicValue(next);
                                    toast.success(res.success.reason);
                                    router.refresh();
                                  } else {
                                    toast.error(
                                      res?.error?.reason ??
                                        "Failed to update public",
                                    );
                                  }
                                } finally {
                                  setPubUpdating(false);
                                }
                              }}
                            >
                              {pubUpdating
                                ? "Updating..."
                                : publicValue
                                  ? "Make Private"
                                  : "Make Public"}
                            </Button>
                          </div>
                        </div>

                        <div className="border rounded-md p-3 md:col-span-2">
                          <div className="text-sm font-medium mb-1">
                            Department access
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-muted-foreground">
                                {deptEnabled
                                  ? `Enabled for ${doc.department} department`
                                  : "Not departmental"}
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  className="border rounded px-2 text-sm"
                                  disabled={!deptEnabled}
                                  value={deptLevel}
                                  onChange={(e) =>
                                    setDeptLevel(
                                      e.target.value as
                                        | "view"
                                        | "edit"
                                        | "manage",
                                    )
                                  }
                                >
                                  <option value="view">View</option>
                                  <option value="edit">Edit</option>
                                  <option value="manage">Manage</option>
                                </select>
                                <Button
                                  variant="outline"
                                  disabled={deptUpdating}
                                  onClick={async () => {
                                    try {
                                      setDeptUpdating(true);
                                      const res = await updateDepartmentAccess(
                                        doc.id,
                                        deptEnabled,
                                        deptEnabled ? deptLevel : undefined,
                                        pathname,
                                      );
                                      if (res?.success) {
                                        toast.success(res.success.reason);
                                        router.refresh();
                                      } else {
                                        toast.error(
                                          res?.error?.reason ??
                                            "Failed to update departmental access",
                                        );
                                      }
                                    } finally {
                                      setDeptUpdating(false);
                                    }
                                  }}
                                >
                                  {deptUpdating ? "Updating..." : "Save"}
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-muted-foreground">
                                Toggle departmental access for your department
                                and set an access level.
                              </div>
                              <Button
                                variant={deptEnabled ? "secondary" : "outline"}
                                onClick={() => setDeptEnabled((v) => !v)}
                              >
                                {deptEnabled
                                  ? "Disable departmental"
                                  : "Enable departmental"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Add user</div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="user@example.com"
                            value={shareEmail}
                            onChange={(e) => setShareEmail(e.target.value)}
                          />
                          <select
                            className="border rounded px-2 text-sm"
                            value={shareLevel}
                            onChange={(e) =>
                              setShareLevel(
                                e.target.value as "view" | "edit" | "manage",
                              )
                            }
                          >
                            <option value="view">View</option>
                            <option value="edit">Edit</option>
                            <option value="manage">Manage</option>
                          </select>
                          <Button onClick={handleShareAdd}>Add</Button>
                        </div>
                        {shareSuggestionsLoading && (
                          <div className="text-xs text-muted-foreground">
                            Searching…
                          </div>
                        )}
                        {shareSuggestions.length > 0 && (
                          <div className="border rounded p-2 max-h-40 overflow-y-auto">
                            {shareSuggestions.map((s: any) => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between py-1 hover:bg-muted/50 px-2 rounded cursor-pointer"
                                onClick={() => setShareEmail(s.email)}
                              >
                                <div className="text-sm">
                                  {s.name} •{" "}
                                  <span className="text-muted-foreground">
                                    {s.email}
                                  </span>
                                </div>
                                <Badge variant="outline">{s.department}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">
                            Current shares
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await queryClient.invalidateQueries({
                                queryKey: ["document-shares", doc.id],
                              });
                            }}
                          >
                            Refresh
                          </Button>
                        </div>
                        {sharesLoading ? (
                          <DocumentSharesSkeleton />
                        ) : shares.length === 0 ? (
                          <div className="text-xs text-muted-foreground">
                            No shares yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {shares.map((u: any) => (
                              <div
                                key={u.userId}
                                className="flex items-center justify-between border rounded p-2"
                              >
                                <div className="text-sm">
                                  {u.name ?? "User"} •{" "}
                                  <span className="text-muted-foreground">
                                    {u.email}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <select
                                    className="border rounded px-2 text-sm"
                                    defaultValue={u.accessLevel}
                                    onChange={async (e) => {
                                      const lvl = e.target.value as
                                        | "view"
                                        | "edit"
                                        | "manage";
                                      const res = await addDocumentShare(
                                        doc.id,
                                        u.email,
                                        lvl,
                                      );
                                      if (res.success) {
                                        toast.success("Share updated");
                                        await queryClient.invalidateQueries({
                                          queryKey: ["document-shares", doc.id],
                                        });
                                      } else {
                                        toast.error(
                                          res.error?.reason ??
                                            "Failed to update share",
                                        );
                                      }
                                    }}
                                  >
                                    <option value="view">View</option>
                                    <option value="edit">Edit</option>
                                    <option value="manage">Manage</option>
                                  </select>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleShareRemove(u.userId)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        You don&apos;t have permission to manage permissions on
                        this document
                      </div>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          await queryClient.invalidateQueries({
                            queryKey: ["document-access", doc.id],
                          });
                          await queryClient.invalidateQueries({
                            queryKey: ["document-shares", doc.id],
                          });
                        }}
                      >
                        Check my access
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>History</CardTitle>
                  <CardDescription>
                    history/logs for the document
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  {logsLoading ? (
                    <DocumentLogsSkeleton />
                  ) : logsError ? (
                    <QueryError
                      error={logsError as Error}
                      onRetry={() => refetchLogs()}
                      title="Failed to load history"
                    />
                  ) : logs.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No history yet.
                    </div>
                  ) : (
                    logs.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between border rounded-md p-3"
                      >
                        <div>
                          <div className="font-medium">{l.action}</div>
                          <div className="text-sm">{l.details}</div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{l.userName ?? "User"}</div>
                          <div>{new Date(l.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function DocumentsActions({
  id,
  pathname,
  type,
}: {
  id: number;
  pathname: string;
  type: "delete" | "archive";
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {type === "delete" ? (
          <Button
            className="flex w-full gap-3 hover:cursor-pointer"
            variant="secondary"
          >
            <Trash2 className="mr-2" size={16} />
            Delete
          </Button>
        ) : (
          <Button
            variant="outline"
            className="flex w-full gap-3 hover:cursor-pointer"
          >
            <Archive className="mr-2" size={16} />
            Archive
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          {type === "delete" ? (
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              file and all its data from our servers.
            </AlertDialogDescription>
          ) : (
            <AlertDialogDescription>
              This action cannot be undone. This will archive the file move all
              its content to the archive page.
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {type === "delete" ? (
            <AlertDialogAction
              onClick={async () => {
                const res = await deleteDocumentAction(id, pathname);
                if (res.error) {
                  toast.error(res.error.reason);
                } else {
                  toast.success(res.success.reason);
                }
              }}
            >
              Continue
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={async () => {
                const res = await archiveDocumentAction(id, pathname);
                if (res.error) {
                  toast.error(res.error.reason);
                } else {
                  toast.success(res.success.reason);
                }
              }}
            >
              Continue
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
