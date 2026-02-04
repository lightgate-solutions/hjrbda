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
  FileIcon,
  User,
  FileText,
  Eye,
  Download,
  MoreVertical,
  Edit2,
  MessageSquare,
  Trash2,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Dropzone, type FileWithMetadata } from "@/components/ui/dropzone";
import { toast } from "sonner";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getDocumentComments,
  addDocumentComment,
  getDocumentVersions,
  getDocumentLogs,
  getMyDocumentAccess,
  getDocumentShares,
  addDocumentShare,
  removeDocumentShare,
  searchEmployeesForShare,
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
}: {
  doc: DocumentType;
  pathname: string;
  trigger?: React.ReactNode;
}) {
  const [files, setFiles] = useState<FileWithMetadata[]>();
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("overview");

  // biome-ignore lint/suspicious/noExplicitAny: Pending proper type definition
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");

  // biome-ignore lint/suspicious/noExplicitAny: Pending proper type definition
  const [versions, setVersions] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // biome-ignore lint/suspicious/noExplicitAny: Pending proper type definition
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [_myAccess, setMyAccess] = useState<{
    level: "none" | "view" | "edit" | "manage";
    isOwner: boolean;
    isAdminDepartment?: boolean;
  } | null>(null);

  const [shareEmail, setShareEmail] = useState("");
  const [shareLevel, setShareLevel] = useState<"view" | "edit" | "manage">(
    "view",
  );
  // biome-ignore lint/suspicious/noExplicitAny: Pending proper type definition
  const [shareSuggestions, setShareSuggestions] = useState<any[]>([]);
  const [shareSuggestionsLoading, setShareSuggestionsLoading] = useState(false);
  // biome-ignore lint/suspicious/noExplicitAny: Pending proper type definition
  const [shares, setShares] = useState<any[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      setCommentsLoading(true);
      const res = await getDocumentComments(doc.id);
      if (res.success) {
        setComments(res.success);
      } else {
        toast.error(res.error?.reason);
      }
    } finally {
      setCommentsLoading(false);
    }
  }, [doc.id]);

  const loadVersions = useCallback(async () => {
    try {
      setVersionsLoading(true);
      const res = await getDocumentVersions(doc.id);
      if (res.success) {
        setVersions(res.success);
      } else {
        toast.error(res.error?.reason);
      }
    } finally {
      setVersionsLoading(false);
    }
  }, [doc.id]);

  const loadLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const res = await getDocumentLogs(doc.id);
      if (res.success) {
        setLogs(res.success);
      } else {
        toast.error(res.error?.reason);
      }
    } finally {
      setLogsLoading(false);
    }
  }, [doc.id]);

  const loadMyAccess = useCallback(async () => {
    const res = await getMyDocumentAccess(doc.id);
    if (res.success) {
      setMyAccess(res.success);
    } else {
      toast.error(res.error.reason);
    }
  }, [doc.id]);

  useEffect(() => {
    loadMyAccess();
  }, [loadMyAccess]);

  const loadShares = useCallback(async () => {
    try {
      setSharesLoading(true);
      const res = await getDocumentShares(doc.id);
      if (res.success) setShares(res.success);
      else if (res.error) toast.error(res.error.reason);
    } finally {
      setSharesLoading(false);
    }
  }, [doc.id]);

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
    if (activeTab === "sharing") loadShares();
  }, [activeTab, loadComments, loadVersions, loadLogs, loadShares]);

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

        xhr.onerror = () => {
          reject(new Error("Upload failed"));
        };

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
      setProgress(100);
      // biome-ignore lint/style/noNonNullAssertion: Env var guaranteed
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
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            className="flex flex-1 w-full gap-3 hover:cursor-pointer"
          >
            <Eye size={16} />
            Open
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="min-w-[90vw] sm:min-w-[600px] lg:min-w-[800px] flex flex-col h-full">
        <SheetHeader className="space-y-4 pb-4 border-b">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <FileIcon className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <SheetTitle className="text-xl">
                {doc.title.charAt(0).toUpperCase() + doc.title.slice(1)}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="font-normal">
                  v{doc.currentVersion}
                </Badge>
                <span>•</span>
                <span>{doc.fileSize} MB</span>
                <span>•</span>
                <span>Modified {doc.updatedAt.toLocaleDateString()}</span>
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link
                target="_blank"
                href={doc.filePath ?? ""}
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
              </Link>
              <a
                href={doc.filePath ?? ""}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </a>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <DocumentsActions
                      type="archive"
                      id={doc.id}
                      pathname={pathname}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" asChild>
                    <DocumentsActions
                      type="delete"
                      id={doc.id}
                      pathname={pathname}
                    />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0 mt-4"
        >
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="comments"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Comments
            </TabsTrigger>
            <TabsTrigger
              value="versions"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Versions
            </TabsTrigger>
            <TabsTrigger
              value="sharing"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Sharing
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              History
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 -mx-6 px-6 py-4">
            <TabsContent value="overview" className="space-y-6 m-0">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Description
                  </h3>
                  <p className="text-sm">
                    {doc.description || "No description provided."}
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Details
                  </h3>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Uploaded By</dt>
                      <dd>{doc.uploader}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Created At</dt>
                      <dd>{doc.createdAt.toLocaleDateString()}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className="capitalize">{doc.status}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Type</dt>
                      <dd>{doc.mimeType || "Unknown"}</dd>
                    </div>
                  </dl>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">
                    Quick Actions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit2 className="h-4 w-4 mr-2" />
                          Upload New Version
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
                          className="space-y-6"
                        >
                          <Dropzone
                            provider="cloudflare-r2"
                            variant="compact"
                            maxFiles={1}
                            maxSize={1024 * 1024 * 50} // 50MB
                            onFilesChange={(files) => setFiles(files)}
                          />
                          <Button
                            type="submit"
                            disabled={isUploading}
                            className="w-full"
                          >
                            {isUploading && <Spinner className="mr-2" />}
                            {!isUploading ? "Upload Version" : "Uploading..."}
                          </Button>
                          {isUploading && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {progress < 100
                                    ? "Uploading..."
                                    : "Upload complete!"}
                                </span>
                                <span className="font-medium">{progress}%</span>
                              </div>
                              <Progress value={progress} className="w-full" />
                            </div>
                          )}
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="comments" className="space-y-4 m-0">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <Button onClick={handleAddComment} size="icon">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                {commentsLoading ? (
                  <div className="flex justify-center py-4">
                    <Spinner />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No comments yet.
                  </div>
                ) : (
                  <>
                    {/* biome-ignore lint/suspicious/noExplicitAny: Pending proper type definition */}
                    {comments.map((comment: any) => (
                      <div key={comment.id} className="flex gap-3 text-sm">
                        <div className="bg-muted h-8 w-8 rounded-full flex items-center justify-center shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {comment.user.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-muted-foreground">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="versions" className="space-y-4 m-0">
              {versionsLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* biome-ignore lint/suspicious/noExplicitAny: Pending proper type definition */}
                  {versions.map((v: any) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between border rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-muted p-2 rounded">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">Version {v.version}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(v.createdAt).toLocaleDateString()} •{" "}
                            {v.fileSize} MB
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link
                          href={v.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <a
                          href={v.filePath}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sharing" className="space-y-6 m-0">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="user@example.com"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                  />
                  <select
                    className="border rounded px-2 text-sm bg-background"
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
                    Searching...
                  </div>
                )}
                {shareSuggestions.length > 0 && (
                  <div className="border rounded-md p-2 max-h-40 overflow-y-auto bg-popover">
                    {/* biome-ignore lint/suspicious/noExplicitAny: Pending proper type definition */}
                    {shareSuggestions.map((s: any) => (
                      <button
                        type="button"
                        key={s.id}
                        className="flex items-center justify-between py-1.5 px-2 hover:bg-muted rounded cursor-pointer w-full border-0 bg-transparent"
                        onClick={() => setShareEmail(s.email)}
                      >
                        <div className="text-sm">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-muted-foreground ml-2">
                            {s.email}
                          </span>
                        </div>
                        <Badge variant="outline">{s.department}</Badge>
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">People with access</h4>
                  {sharesLoading ? (
                    <div className="text-xs text-muted-foreground">
                      Loading...
                    </div>
                  ) : shares.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic">
                      No specific users have been granted access.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* biome-ignore lint/suspicious/noExplicitAny: Pending proper type definition */}
                      {shares.map((u: any) => (
                        <div
                          key={u.userId}
                          className="flex items-center justify-between border rounded p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-muted h-8 w-8 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium">
                                {u.name?.[0] || "U"}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                {u.name ?? "User"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {u.email} • {u.accessLevel}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleShareRemove(u.userId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4 m-0">
              {logsLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : (
                <div className="relative border-l ml-2 space-y-6 pl-6 py-2">
                  {/* biome-ignore lint/suspicious/noExplicitAny: Pending proper type definition */}
                  {logs.map((log: any, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: Log ID not available
                    <div key={i} className="relative">
                      <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border bg-background" />
                      <div className="text-sm">
                        <span className="font-medium">{log.user.name}</span>{" "}
                        <span className="text-muted-foreground">
                          {log.action.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
