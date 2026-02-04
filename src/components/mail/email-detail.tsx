/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Archive,
  ArchiveX,
  ArrowLeft,
  Forward,
  Loader2,
  Reply,
  Trash2,
  Undo2,
  X,
  FileText,
  Eye,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  archiveEmail,
  unarchiveEmail,
  moveEmailToTrash,
  restoreEmailFromTrash,
  deleteSentEmail,
  permanentlyDeleteEmail,
  getEmailAttachments,
  removeAttachmentFromEmail,
} from "@/actions/mail/email";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { ScrollArea } from "../ui/scroll-area";

interface Recipient {
  id: number;
  name: string;
  email: string;
  image?: string | null;
  isRead: boolean;
  readAt?: Date | null;
}

interface Attachment {
  id: number;
  emailId: number;
  documentId: number;
  createdAt: Date;
  documentTitle: string;
  documentDescription: string | null;
  documentFileName: string | null;
  documentMimeType: string | null;
  documentFileSize: string | null;
  documentFilePath: string | null;
  documentUploader: string | null;
  documentUploaderEmail: string | null;
}

interface EmailData {
  id: number;
  subject: string;
  body: string;
  createdAt: Date;
  type: string;
  parentEmailId?: number | null;
  senderId: number;
  senderName: string;
  senderEmail: string;
  senderImage?: string | null;
  hasBeenOpened: boolean;
  recipients: Recipient[];
  isSender: boolean;
  isRecipient: boolean;
  recipientStatus?: {
    isRead: boolean;
    isArchived: boolean;
    isDeleted: boolean;
    readAt?: Date | null;
  } | null;
}

interface EmailDetailProps {
  email: EmailData;
  onBack: () => void;
  onReply?: () => void;
  onForward?: () => void;
  onUpdate?: () => void;
  folder?: "inbox" | "sent" | "archive" | "trash";
}

export function EmailDetail({
  email,
  onBack,
  onReply,
  onForward,
  onUpdate,
  folder,
}: EmailDetailProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteAction, setDeleteAction] = useState<
    "trash" | "permanent" | "sent"
  >("trash");
  const [attachments, setAttachments] = useState<any>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Load attachments when component mounts
  useEffect(() => {
    loadAttachments();
  }, [email.id]);

  const loadAttachments = async () => {
    setLoadingAttachments(true);
    const result = await getEmailAttachments(email.id);
    if (result.success) {
      setAttachments(result.data || []);
    } else {
      toast.error(result.error || "Failed to load attachments");
    }
    setLoadingAttachments(false);
  };

  const handleRemoveAttachment = async (attachmentId: number) => {
    setIsLoading(true);
    const result = await removeAttachmentFromEmail(attachmentId);
    if (result.success) {
      toast.success("Attachment removed");
      loadAttachments(); // Reload attachments
      onUpdate?.(); // Refresh the email list
    } else {
      toast.error(result.error || "Failed to remove attachment");
    }
    setIsLoading(false);
  };

  const handleViewAttachment = (attachment: Attachment) => {
    // Open document in new tab
    window.open(`/documents/${attachment.documentId}`, "_blank");
  };

  const handleArchive = async () => {
    setIsLoading(true);
    const result = await archiveEmail(Number(email.id));

    if (result.success) {
      toast.success("Email archived");
      onUpdate?.();
      onBack();
    } else {
      toast.error(result.error || "Failed to archive email");
    }
    setIsLoading(false);
  };

  const handleUnarchive = async () => {
    setIsLoading(true);
    const result = await unarchiveEmail(Number(email.id));

    if (result.success) {
      toast.success("Email moved to inbox");
      onUpdate?.();
      onBack();
    } else {
      toast.error(result.error || "Failed to unarchive email");
    }
    setIsLoading(false);
  };

  const handleMoveToTrash = async () => {
    setIsLoading(true);
    const result = await moveEmailToTrash(Number(email.id));

    if (result.success) {
      toast.success("Email moved to trash");
      onUpdate?.();
      onBack();
    } else {
      toast.error(result.error || "Failed to move email to trash");
    }
    setIsLoading(false);
  };

  const handleRestore = async () => {
    setIsLoading(true);
    const result = await restoreEmailFromTrash(Number(email.id));

    if (result.success) {
      toast.success("Email restored");
      onUpdate?.();
      onBack();
    } else {
      toast.error(result.error || "Failed to restore email");
    }
    setIsLoading(false);
  };

  const handleDeleteSent = async () => {
    setIsLoading(true);
    const result = await deleteSentEmail(Number(email.id));

    if (result.success) {
      toast.success("Email deleted");
      onUpdate?.();
      onBack();
    } else {
      toast.error(result.error || "Failed to delete email");
    }
    setIsLoading(false);
    setShowDeleteDialog(false);
  };

  const handlePermanentDelete = async () => {
    setIsLoading(true);
    const result = await permanentlyDeleteEmail(Number(email.id));

    if (result.success) {
      toast.success("Email permanently deleted");
      onUpdate?.();
      onBack();
    } else {
      toast.error(result.error || "Failed to delete email");
    }
    setIsLoading(false);
    setShowDeleteDialog(false);
  };

  const confirmDelete = (action: "trash" | "permanent" | "sent") => {
    setDeleteAction(action);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteAction === "sent") {
      handleDeleteSent();
    } else if (deleteAction === "permanent") {
      handlePermanentDelete();
    } else {
      setShowDeleteDialog(false);
      handleMoveToTrash();
    }
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b p-2 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} title="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />

            {email.isRecipient && folder !== "trash" && (
              <>
                {folder === "archive" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleUnarchive}
                    disabled={isLoading}
                    title="Move to Inbox"
                  >
                    <ArchiveX className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleArchive}
                    disabled={isLoading}
                    title="Archive"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => confirmDelete("trash")}
                  disabled={isLoading}
                  title="Delete"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}

            {email.isRecipient && folder === "trash" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRestore}
                  disabled={isLoading}
                  title="Restore"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => confirmDelete("permanent")}
                  disabled={isLoading}
                  title="Delete Forever"
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}

            {email.isSender && folder === "sent" && !email.hasBeenOpened && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => confirmDelete("sent")}
                disabled={isLoading}
                title="Delete"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {email.isRecipient && folder !== "trash" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReply}
                  className="gap-2"
                >
                  <Reply className="h-4 w-4" />
                  <span className="hidden sm:inline">Reply</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onForward}
                  className="gap-2"
                >
                  <Forward className="h-4 w-4" />
                  <span className="hidden sm:inline">Forward</span>
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Mark as unread</DropdownMenuItem>
                <DropdownMenuItem>Report spam</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold leading-tight">
                  {email.subject}
                </h1>
                {email.type !== "sent" && (
                  <Badge variant="outline" className="flex-shrink-0">
                    {email.type}
                  </Badge>
                )}
              </div>

              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={email.senderImage || undefined} />
                  <AvatarFallback>
                    {getInitials(email.senderName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm">
                      {email.senderName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(email.createdAt), "PPpp")}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {email.senderEmail}
                  </div>
                  <div className="mt-1">
                    <Accordion
                      type="single"
                      collapsible
                      className="w-full border-none"
                    >
                      <AccordionItem value="recipients" className="border-none">
                        <AccordionTrigger className="py-0 text-xs text-muted-foreground hover:no-underline justify-start gap-1">
                          to {email.recipients.length} recipients
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                          <div className="space-y-2">
                            {email.recipients.map((recipient) => (
                              <div
                                key={recipient.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage
                                      src={recipient.image || undefined}
                                    />
                                    <AvatarFallback className="text-[10px]">
                                      {getInitials(recipient.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{recipient.name}</span>
                                  <span className="text-muted-foreground text-xs">
                                    &lt;{recipient.email}&gt;
                                  </span>
                                </div>
                                {email.isSender && (
                                  <div className="flex items-center gap-2">
                                    {recipient.isRead ? (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] text-green-600 border-green-200 bg-green-50"
                                      >
                                        Read{" "}
                                        {recipient.readAt &&
                                          formatDistanceToNow(
                                            new Date(recipient.readAt),
                                            { addSuffix: true },
                                          )}
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px]"
                                      >
                                        Unread
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="mb-8" />

            {/* Body */}
            <div className="prose prose-sm max-w-none dark:prose-invert mb-8">
              <div className="whitespace-pre-wrap font-sans text-foreground leading-relaxed">
                {email.body}
              </div>
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {attachments.length} Attachments
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="group flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {attachment.documentTitle}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {attachment.documentFileSize || "Unknown size"}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewAttachment(attachment)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {email.isSender && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() =>
                              handleRemoveAttachment(attachment.id)
                            }
                            title="Remove"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loadingAttachments && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading attachments...
              </div>
            )}

            {/* Reply/Forward Actions (Bottom) */}
            {email.isRecipient && folder !== "trash" && (
              <div className="flex gap-3 mt-8">
                <Button variant="outline" onClick={onReply} className="gap-2">
                  <Reply className="h-4 w-4" />
                  Reply
                </Button>
                <Button variant="outline" onClick={onForward} className="gap-2">
                  <Forward className="h-4 w-4" />
                  Forward
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteAction === "permanent"
                ? "Permanently Delete Email"
                : deleteAction === "sent"
                  ? "Delete Sent Email"
                  : "Move to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAction === "permanent"
                ? "This action cannot be undone. This email will be permanently deleted from your account."
                : deleteAction === "sent"
                  ? "This email has not been opened by any recipient yet. Are you sure you want to delete it? This action cannot be undone."
                  : "This email will be moved to trash. You can restore it later if needed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
