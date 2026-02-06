/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */
// biome-ignore-all lint/style/noNonNullAssertion: <>
"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Eye,
  Download,
  MoreVertical,
  Upload,
  Trash2,
  Send,
  Clock,
  User,
  Tag,
  Globe,
  Building2,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Dropzone, type FileWithMetadata } from "@/components/ui/dropzone";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getDocumentComments,
  addDocumentComment,
  getDocumentVersions,
  deleteDocumentVersion,
  getDocumentLogs,
  getMyDocumentAccess,
  getDocumentShares,
  addDocumentShare,
  removeDocumentShare,
  searchEmployeesForShare,
  updateDocumentPublic,
  updateDepartmentAccess,
  type getActiveFolderDocuments,
} from "@/actions/documents/documents";
import { uploadNewDocumentVersion } from "@/actions/documents/upload";
import { DocumentsActions } from "./document-actions";

type DocumentType = NonNullable<
  Awaited<ReturnType<typeof getActiveFolderDocuments>>["success"]
>["docs"][number];

export function DocumentSheet({
  doc,
  pathname,
  trigger,
  open,
  onOpenChange,
}: {
  doc: DocumentType;
  pathname: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [files, setFiles] = useState<FileWithMetadata[]>();
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("overview");

  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");

  const [versions, setVersions] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [myAccess, setMyAccess] = useState<{
    level: "none" | "view" | "edit" | "manage";
    isOwner: boolean;
    isAdminDepartment?: boolean;
  } | null>(null);

  const [shareEmail, setShareEmail] = useState("");
  const [shareLevel, setShareLevel] = useState<"view" | "edit" | "manage">(
    "view",
  );
  const [shareSuggestions, setShareSuggestions] = useState<any[]>([]);
  const [shareSuggestionsLoading, setShareSuggestionsLoading] = useState(false);
  const [shares, setShares] = useState<any[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

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

  async function loadComments() {
    try {
      setCommentsLoading(true);
      const res = await getDocumentComments(doc.id);
      if (res.success) setComments(res.success);
      else toast.error(res.error?.reason);
    } finally {
      setCommentsLoading(false);
    }
  }

  async function loadVersions() {
    try {
      setVersionsLoading(true);
      const res = await getDocumentVersions(doc.id);
      if (res.success) setVersions(res.success);
      else toast.error(res.error?.reason);
    } finally {
      setVersionsLoading(false);
    }
  }

  async function loadLogs() {
    try {
      setLogsLoading(true);
      const res = await getDocumentLogs(doc.id);
      if (res.success) setLogs(res.success);
      else toast.error(res.error?.reason);
    } finally {
      setLogsLoading(false);
    }
  }

  async function loadMyAccess() {
    const res = await getMyDocumentAccess(doc.id);
    if (res.success) setMyAccess(res.success);
    else toast.error(res.error.reason);
  }

  useEffect(() => {
    loadMyAccess();
  }, []);

  async function loadShares() {
    try {
      setSharesLoading(true);
      const res = await getDocumentShares(doc.id);
      if (res.success) setShares(res.success);
      else if (res.error) toast.error(res.error.reason);
    } finally {
      setSharesLoading(false);
    }
  }

  async function handleShareAdd() {
    const email = shareEmail.trim();
    if (!email) return;
    const res = await addDocumentShare(doc.id, email, shareLevel);
    if (res.success) {
      toast.success(res.success.reason);
      setShareEmail("");
      await loadShares();
    } else {
      toast.error(res.error?.reason ?? "Failed to add share");
    }
  }

  async function handleShareRemove(userId: number) {
    const res = await removeDocumentShare(doc.id, userId);
    if (res.success) {
      toast.success(res.success.reason);
      await loadShares();
    } else {
      toast.error(res.error?.reason ?? "Failed to remove share");
    }
  }

  useEffect(() => {
    if (!shareEmail || shareEmail.length < 2) {
      setShareSuggestions([]);
      return;
    }
    let canceled = false;
    setShareSuggestionsLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchEmployeesForShare(shareEmail);
        if (!canceled) {
          if (res.success) setShareSuggestions(res.success);
          else setShareSuggestions([]);
        }
      } finally {
        if (!canceled) setShareSuggestionsLoading(false);
      }
    }, 300);
    return () => {
      canceled = true;
      clearTimeout(t);
    };
  }, [shareEmail]);

  useEffect(() => {
    if (activeTab === "comments") loadComments();
    if (activeTab === "versions") loadVersions();
    if (activeTab === "history") loadLogs();
    if (activeTab === "permissions") loadShares();
  }, [activeTab, doc.id]);

  async function handleAddComment() {
    const text = commentText.trim();
    if (!text) return;
    const res = await addDocumentComment(doc.id, text);
    if (res.success) {
      setCommentText("");
      toast.success("Comment added");
      await loadComments();
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
        xhr.onerror = () => reject(new Error("Upload failed"));
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
        toast.success("New version uploaded successfully");
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

  const canEdit =
    myAccess?.isOwner ||
    myAccess?.level === "edit" ||
    myAccess?.level === "manage";
  const canManage =
    myAccess?.isOwner ||
    myAccess?.isAdminDepartment ||
    myAccess?.level === "manage";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <Eye size={15} aria-hidden="true" />
            Open
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="min-w-[92vw] sm:min-w-[600px] lg:min-w-3xl 2xl:min-w-4xl flex flex-col h-full p-0">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border space-y-0">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/8 p-3 shrink-0">
              <FileText size={24} className="text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <SheetTitle className="text-lg font-semibold truncate">
                {doc.title.charAt(0).toUpperCase() + doc.title.slice(1)}
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <Badge
                  variant="outline"
                  className="font-normal text-xs px-1.5 py-0"
                >
                  v{doc.currentVersion}
                </Badge>
                <span className="text-muted-foreground">{doc.fileSize} MB</span>
                <span className="text-muted-foreground">
                  Modified {doc.updatedAt.toLocaleDateString()}
                </span>
              </SheetDescription>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-4">
            <Link
              target="_blank"
              href={doc.filePath ?? ""}
              rel="noopener noreferrer"
              aria-label="Open document in new tab"
            >
              <Button size="sm" variant="outline" className="gap-1.5">
                <Eye size={14} aria-hidden="true" />
                View
              </Button>
            </Link>
            <Button
              size="sm"
              className="gap-1.5"
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
              aria-label="Download document"
            >
              <Download size={14} aria-hidden="true" />
              Download
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Upload size={14} aria-hidden="true" />
                  <span className="hidden sm:inline">New Version</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload New Version</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                  }}
                  className="space-y-4"
                >
                  <Dropzone
                    provider="cloudflare-r2"
                    variant="compact"
                    maxFiles={1}
                    maxSize={1024 * 1024 * 50}
                    onFilesChange={(files) => setFiles(files)}
                  />
                  <Button
                    type="submit"
                    disabled={isUploading}
                    className="w-full"
                  >
                    {isUploading && <Spinner className="mr-2" />}
                    {!isUploading ? "Upload" : "Uploading..."}
                  </Button>
                  {isUploading && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {progress < 100 ? "Uploading..." : "Complete"}
                        </span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="w-full h-1.5" />
                    </div>
                  )}
                </form>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="More actions"
                >
                  <MoreVertical size={15} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <DocumentsActions
                    type="archive"
                    id={doc.id}
                    pathname={pathname}
                  />
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
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
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-6 border-b border-border">
            <TabsList className="h-auto p-0 bg-transparent rounded-none w-full justify-start gap-0">
              {[
                "overview",
                "comments",
                "versions",
                "permissions",
                ...(canManage ? ["history"] : []),
              ].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="m-0 space-y-6">
              {doc.description && (
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Description
                  </h4>
                  <p className="text-sm leading-relaxed">{doc.description}</p>
                </div>
              )}

              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                  Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-muted p-1.5 mt-0.5">
                      <User
                        size={14}
                        className="text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Owner</p>
                      <p className="text-sm font-medium">{doc.uploader}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-muted p-1.5 mt-0.5">
                      <Clock
                        size={14}
                        className="text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm font-medium">
                        {doc.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-muted p-1.5 mt-0.5">
                      <FileText
                        size={14}
                        className="text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="text-sm font-medium">{doc.mimeType}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-muted p-1.5 mt-0.5">
                      <Shield
                        size={14}
                        className="text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="text-sm font-medium capitalize">
                        {doc.status}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {doc.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {doc.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                      >
                        <Tag size={11} aria-hidden="true" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* COMMENTS TAB */}
            <TabsContent value="comments" className="m-0 space-y-5">
              {canEdit && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                    aria-label="Comment text"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      className="gap-1.5"
                    >
                      <Send size={13} aria-hidden="true" />
                      Post
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {commentsLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-muted-foreground">
                      No comments yet
                    </p>
                  </div>
                ) : (
                  comments.map((c, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-[10px] font-medium">
                              {(c.userName ?? "U")[0]}
                            </span>
                          </div>
                          <span className="text-sm font-medium">
                            {c.userName ?? "User"}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-8">
                        {c.comment}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* VERSIONS TAB */}
            <TabsContent value="versions" className="m-0 space-y-3">
              {versionsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground">
                    No version history
                  </p>
                </div>
              ) : (
                versions.map((v) => {
                  const isCurrent = v.versionNumber === doc.currentVersion;
                  return (
                    <div
                      key={v.id}
                      className={`rounded-lg border p-3 flex items-center justify-between transition-colors ${
                        isCurrent
                          ? "border-primary/20 bg-primary/4"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`rounded-md p-1.5 shrink-0 ${
                            isCurrent ? "bg-primary/10" : "bg-muted"
                          }`}
                        >
                          <FileText
                            size={14}
                            className={
                              isCurrent
                                ? "text-primary"
                                : "text-muted-foreground"
                            }
                            aria-hidden="true"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              v{v.versionNumber}
                            </span>
                            {isCurrent && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(v.createdAt).toLocaleString()} ·{" "}
                            {v.fileSize} MB · {v.uploadedByName ?? "User"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
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
                              window.open(url, "_blank", "noopener,noreferrer");
                            }
                          }}
                          aria-label={`Download version ${v.versionNumber}`}
                        >
                          <Download size={14} />
                        </Button>
                        {!isCurrent && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                              const res = await deleteDocumentVersion(
                                v.id,
                                pathname,
                              );
                              if (res?.success) {
                                toast.success(res.success.reason);
                                await loadVersions();
                                router.refresh();
                              } else {
                                toast.error(
                                  res?.error?.reason ??
                                    "Failed to delete version",
                                );
                              }
                            }}
                            aria-label={`Delete version ${v.versionNumber}`}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>

            {/* PERMISSIONS TAB */}
            <TabsContent value="permissions" className="m-0 space-y-6">
              {!myAccess ? (
                <div className="flex items-center justify-between py-4">
                  <p className="text-sm text-muted-foreground">
                    Loading permissions...
                  </p>
                  <Spinner />
                </div>
              ) : canManage ? (
                <>
                  {/* Access Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <User
                          size={14}
                          className="text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Owner
                        </span>
                      </div>
                      <p className="text-sm font-medium">{doc.uploader}</p>
                      <p className="text-xs text-muted-foreground">
                        Full access
                      </p>
                    </div>

                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Globe
                            size={14}
                            className="text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Public
                          </span>
                        </div>
                        <button
                          type="button"
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
                                  res?.error?.reason ?? "Failed to update",
                                );
                              }
                            } finally {
                              setPubUpdating(false);
                            }
                          }}
                          disabled={pubUpdating}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            publicValue ? "bg-primary" : "bg-muted"
                          }`}
                          role="switch"
                          aria-checked={publicValue}
                          aria-label="Toggle public access"
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              publicValue ? "translate-x-4" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {publicValue
                          ? "Anyone in the organization can view"
                          : "Only shared users have access"}
                      </p>
                    </div>
                  </div>

                  {/* Department Access */}
                  <div className="rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2
                          size={14}
                          className="text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Department Access
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeptEnabled((v) => !v)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          deptEnabled ? "bg-primary" : "bg-muted"
                        }`}
                        role="switch"
                        aria-checked={deptEnabled}
                        aria-label="Toggle department access"
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            deptEnabled ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                    {deptEnabled && (
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <p className="text-xs text-muted-foreground">
                          {doc.department} department members can:
                        </p>
                        <div className="flex items-center gap-2">
                          <select
                            className="h-8 rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={deptLevel}
                            onChange={(e) =>
                              setDeptLevel(
                                e.target.value as "view" | "edit" | "manage",
                              )
                            }
                            aria-label="Department access level"
                          >
                            <option value="view">View</option>
                            <option value="edit">Edit</option>
                            <option value="manage">Manage</option>
                          </select>
                          <Button
                            size="sm"
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
                                    res?.error?.reason ?? "Failed to update",
                                  );
                                }
                              } finally {
                                setDeptUpdating(false);
                              }
                            }}
                          >
                            {deptUpdating ? (
                              <Spinner className="h-3 w-3" />
                            ) : (
                              "Save"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Share with Users */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Share with people
                    </h4>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Email address"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        className="text-sm h-9"
                        aria-label="Email to share with"
                      />
                      <select
                        className="h-9 rounded-md border border-border bg-background px-2 text-xs shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={shareLevel}
                        onChange={(e) =>
                          setShareLevel(
                            e.target.value as "view" | "edit" | "manage",
                          )
                        }
                        aria-label="Access level for share"
                      >
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                        <option value="manage">Manage</option>
                      </select>
                      <Button
                        size="sm"
                        onClick={handleShareAdd}
                        className="h-9 shrink-0"
                      >
                        Share
                      </Button>
                    </div>

                    {shareSuggestionsLoading && (
                      <p className="text-xs text-muted-foreground">
                        Searching...
                      </p>
                    )}
                    {shareSuggestions.length > 0 && (
                      <div className="rounded-lg border border-border divide-y divide-border max-h-36 overflow-y-auto">
                        {shareSuggestions.map((s: any) => (
                          <button
                            type="button"
                            key={s.id}
                            className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => setShareEmail(s.email)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-[10px] font-medium">
                                  {s.name?.[0] ?? "?"}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{s.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {s.email}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] shrink-0"
                            >
                              {s.department}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Current Shares */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        People with access
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => loadShares()}
                      >
                        Refresh
                      </Button>
                    </div>
                    {sharesLoading ? (
                      <div className="flex justify-center py-4">
                        <Spinner />
                      </div>
                    ) : shares.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No one else has access yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {shares.map((u: any) => (
                          <div
                            key={u.userId}
                            className="flex items-center justify-between rounded-lg border border-border p-2.5"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <span className="text-xs font-medium">
                                  {(u.name ?? "U")[0]}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {u.name ?? "User"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {u.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <select
                                className="h-7 rounded-md border border-border bg-background px-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                                    toast.success("Updated");
                                    await loadShares();
                                  } else {
                                    toast.error(res.error?.reason ?? "Failed");
                                  }
                                }}
                                aria-label={`Access level for ${u.name}`}
                              >
                                <option value="view">View</option>
                                <option value="edit">Edit</option>
                                <option value="manage">Manage</option>
                              </select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleShareRemove(u.userId)}
                                aria-label={`Remove ${u.name}'s access`}
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-10">
                  <Shield
                    size={32}
                    className="mx-auto text-muted-foreground mb-3"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-muted-foreground">
                    You don&apos;t have permission to manage access
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      loadMyAccess();
                      loadShares();
                    }}
                  >
                    Check access
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* HISTORY TAB */}
            <TabsContent value="history" className="m-0">
              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-10">
                  <Clock
                    size={32}
                    className="mx-auto text-muted-foreground mb-3"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-muted-foreground">
                    No activity recorded yet
                  </p>
                </div>
              ) : (
                <div className="relative ml-3 border-l border-border pl-6 space-y-5 py-1">
                  {logs.map((l) => (
                    <div key={l.id} className="relative">
                      <div className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-border bg-background" />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm">
                            <span className="font-medium capitalize">
                              {l.action}
                            </span>
                          </p>
                          {l.details && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {l.details}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {l.userName ?? "User"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(l.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
