"use client";

import { Dialog } from "@/components/ui/dialog";
import EmployeeDocumentsUpload from "./employee-documents-upload";
import EmployeeDocumentsList from "./employee-documents-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRef } from "react";

interface EmployeeDocumentsProps {
  employeeId: number;
  employeeName: string;
}

export default function EmployeeDocuments({
  employeeId,
  employeeName,
}: EmployeeDocumentsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleUploadSuccess = () => {
    if (listRef.current) {
      const event = new Event("documentuploaded");
      listRef.current.dispatchEvent(event);
    }
  };

  return (
    <Dialog>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Employee Documents</CardTitle>
            <CardDescription>
              Manage documents for {employeeName}
            </CardDescription>
          </div>
          <EmployeeDocumentsUpload
            employeeId={employeeId}
            onSuccess={handleUploadSuccess}
          />
        </CardHeader>
        <CardContent>
          <div ref={listRef}>
            <EmployeeDocumentsList employeeId={employeeId} />
          </div>
        </CardContent>
      </Card>
    </Dialog>
  );
}
