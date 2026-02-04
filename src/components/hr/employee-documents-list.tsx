/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */
"use client";

import { useEffect, useState } from "react";
import {
  getEmployeeDocuments,
  deleteEmployeeDocument,
} from "@/actions/hr/employee-documents";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Download, Eye, FileIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type EmployeeDocument = {
  id: number;
  employeeId: number;
  documentType: string;
  documentName: string;
  filePath: string;
  fileSize: string;
  mimeType: string | null;
  uploadedBy: number | null;
  department: string;
  createdAt: Date;
  updatedAt: Date;
};

function getDocumentTypeLabel(type: string): string {
  const documentTypes: Record<string, string> = {
    resume: "Resume/CV",
    id_card: "ID Card",
    passport: "Passport",
    contract: "Contract",
    certification: "Certification",
    visa: "Visa",
    work_permit: "Work Permit",
    other: "Other",
  };

  return documentTypes[type] || type;
}

function getFileTypeIcon(_mimeType: string) {
  return <FileIcon className="h-4 w-4" />;
}

function getMimeTypeBadgeVariant(
  mimeType: string,
): "default" | "outline" | "secondary" | "destructive" {
  if (mimeType.includes("pdf")) return "destructive";
  if (mimeType.includes("image")) return "default";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "secondary";
  return "outline";
}

export default function EmployeeDocumentsList({
  employeeId,
}: {
  employeeId: number;
}) {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    const result = await getEmployeeDocuments(employeeId);
    setLoading(false);

    if (result.success && result.data) {
      setDocuments(result.data);
    } else {
      toast.error(result.error || "Failed to fetch documents");
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [employeeId]);

  const handleDelete = async (documentId: number) => {
    setDeletingId(documentId);

    try {
      const result = await deleteEmployeeDocument(
        documentId,
        window.location.pathname,
      );

      if (result.success) {
        toast.success(result.success.reason);
        // Update local state to remove the deleted document
        setDocuments(documents.filter((doc) => doc.id !== documentId));
      } else {
        toast.error(result.error?.reason || "Failed to delete document");
      }
    } catch (_error) {
      toast.error("An error occurred while deleting the document");
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewDocument = (document: EmployeeDocument) => {
    window.open(document.filePath, "_blank");
  };

  const handleDownloadDocument = async (file: EmployeeDocument) => {
    try {
      const response = await fetch(file.filePath);
      if (!response.ok) throw new Error("Network response was not ok");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = window.document.createElement("a");
      link.href = url;
      link.download = file.documentName || "download";
      window.document.body.appendChild(link);

      link.click();

      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(link);
    } catch (_error) {
      toast.error("Failed to download document");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No documents found for this employee.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {getFileTypeIcon(document.mimeType || "Application/pdf")}
                  <span>{document.documentName}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={getMimeTypeBadgeVariant(
                    document.mimeType || "Application/pdf",
                  )}
                >
                  {getDocumentTypeLabel(document.documentType)}
                </Badge>
              </TableCell>
              <TableCell>{document.fileSize} MB</TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(document.createdAt), {
                  addSuffix: true,
                })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewDocument(document)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownloadDocument(document)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "
                          {document.documentName}"? This action cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground"
                          onClick={() => handleDelete(document.id)}
                        >
                          {deletingId === document.id
                            ? "Deleting..."
                            : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
