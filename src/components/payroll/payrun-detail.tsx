/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  CreditCard,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/utils";
import {
  approvePayrun,
  completePayrun,
  rollbackPayrun,
} from "@/actions/payroll/payrun";
import { toast } from "sonner";
import { getOrganization } from "@/actions/organization";
import { addPdfHeader } from "@/lib/pdf-utils";

type PayrunStatus =
  | "draft"
  | "pending"
  | "processing"
  | "completed"
  | "approved"
  | "paid"
  | "archived";

interface PayrunDetailProps {
  payrun: {
    id: number;
    name: string;
    type: "salary" | "allowance";
    allowanceId: number | null;
    allowanceName: string | null;
    day: number;
    month: number;
    year: number;
    totalEmployees: number;
    totalGrossPay: string;
    totalDeductions: string;
    totalNetPay: string;
    status: PayrunStatus | null;
    generatedBy: number;
    generatedByName: string | null;
    approvedBy: number | null;
    approvedAt: Date | null;
    createdAt: Date | null;
    items: Array<{
      id: number;
      employeeId: number;
      employeeName: string;
      staffNumber: string | null;
      department: string | null;
      baseSalary: string;
      totalAllowances: string;
      totalDeductions: string;
      grossPay: string;
      totalTaxes: string;
      netPay: string;
      status: PayrunStatus | null;
      details: Array<{
        id: number;
        detailType: string;
        description: string;
        amount: string;
        originalAmount: string | null;
        remainingAmount: string | null;
      }>;
    }>;
  };
}

export function PayrunDetail({ payrun }: PayrunDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasExported = useRef(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean;
    type: "approve" | "complete" | "rollback";
  }>({
    open: false,
    type: "approve",
  });

  const approveMutation = useMutation({
    mutationFn: () => approvePayrun(payrun.id, pathname),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        router.refresh();
      } else if (result.error) {
        toast.error(result.error.reason);
      }
    },
    onError: () => {
      toast.error("Failed to approve payrun");
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completePayrun(payrun.id, pathname),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        router.refresh();
      } else if (result.error) {
        toast.error(result.error.reason);
      }
    },
    onError: () => {
      toast.error("Failed to complete payrun");
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: () => rollbackPayrun(payrun.id, pathname),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        router.push("/payroll/payrun");
      } else if (result.error) {
        toast.error(result.error.reason);
      }
    },
    onError: () => {
      toast.error("Failed to rollback payrun");
    },
  });

  const _toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleAlertConfirm = () => {
    if (alertDialog.type === "approve") {
      approveMutation.mutate();
    } else if (alertDialog.type === "complete") {
      completeMutation.mutate();
    } else if (alertDialog.type === "rollback") {
      rollbackMutation.mutate();
    }
    setAlertDialog({ ...alertDialog, open: false });
  };

  const getStatusBadge = (status: PayrunStatus | null) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge variant="default">Approved</Badge>;
      case "paid":
        return <Badge className="bg-green-600 hover:bg-green-700">Paid</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  const formatDate = (_day: number, month: number, year: number) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${months[month - 1]} ${year}`;
  };

  const exportToCsv = () => {
    const headers = [
      "Employee Name",
      "Staff ID",
      "Department",
      "Base Salary",
      "Allowances",
      "Deductions",
      "Taxes",
      "Net Pay",
    ];

    const rows = payrun.items.map((item) => [
      item.employeeName,
      item.staffNumber || "",
      item.department || "",
      Number(item.baseSalary).toFixed(2),
      Number(item.totalAllowances).toFixed(2),
      Number(item.totalDeductions).toFixed(2),
      Number(item.totalTaxes).toFixed(2),
      Number(item.netPay).toFixed(2),
    ]);

    // Add totals row
    rows.push([
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      "",
      Number(payrun.totalNetPay).toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${payrun.name.replace(/\s+/g, "_")}_${payrun.month}_${payrun.year}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully");
  };

  const exportToPdf = async () => {
    const { success: org } = await getOrganization();
    const doc = new jsPDF();

    // Add header with logo
    const startY = await addPdfHeader(doc, {
      organizationName: org?.name || "HJRBDA",
      logoUrl: org?.logoUrl,
      documentTitle: payrun.name,
      subtitle: formatDate(payrun.day, payrun.month, payrun.year),
      isServer: false,
    });

    // Summary
    doc.setFontSize(10);
    const summaryY = startY + 10;
    doc.text(`Total Employees: ${payrun.totalEmployees}`, 14, summaryY);
    doc.text(
      `Total Gross Pay: ${formatCurrency(Number(payrun.totalGrossPay))}`,
      14,
      summaryY + 6,
    );
    doc.text(
      `Total Deductions: ${formatCurrency(Number(payrun.totalDeductions))}`,
      14,
      summaryY + 12,
    );
    doc.text(
      `Total Net Pay: ${formatCurrency(Number(payrun.totalNetPay))}`,
      14,
      summaryY + 18,
    );

    // Table
    const tableData = payrun.items.map((item) => [
      item.employeeName,
      item.staffNumber || "-",
      item.department || "-",
      formatCurrency(Number(item.baseSalary)),
      formatCurrency(Number(item.totalAllowances)),
      formatCurrency(Number(item.totalDeductions) + Number(item.totalTaxes)),
      formatCurrency(Number(item.netPay)),
    ]);

    autoTable(doc, {
      startY: summaryY + 26,
      head: [
        [
          "Employee",
          "Staff ID",
          "Department",
          "Base Salary",
          "Allowances",
          "Deductions",
          "Net Pay",
        ],
      ],
      body: tableData,
      foot: [
        [
          "TOTAL",
          "",
          "",
          "",
          "",
          "",
          formatCurrency(Number(payrun.totalNetPay)),
        ],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: {
        fillColor: [236, 240, 241],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
    });

    doc.save(
      `${payrun.name.replace(/\s+/g, "_")}_${payrun.month}_${payrun.year}.pdf`,
    );
    toast.success("PDF exported successfully");
  };

  // Auto-export when export query param is present
  useEffect(() => {
    if (hasExported.current) return;
    const exportType = searchParams.get("export");
    if (exportType === "pdf") {
      hasExported.current = true;
      exportToPdf();
      router.replace(pathname);
    } else if (exportType === "csv") {
      hasExported.current = true;
      exportToCsv();
      router.replace(pathname);
    }
  }, [searchParams, pathname, router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/payroll/payrun")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Payruns
        </Button>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToPdf}>
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToCsv}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {(payrun.status === "draft" || payrun.status === "pending") && (
            <>
              <Button
                variant="outline"
                onClick={() => setAlertDialog({ open: true, type: "rollback" })}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rollback
              </Button>
              <Button
                onClick={() => setAlertDialog({ open: true, type: "approve" })}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </>
          )}
          {payrun.status === "approved" && (
            <Button
              onClick={() => setAlertDialog({ open: true, type: "complete" })}
              className="bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{payrun.name}</CardTitle>
              <CardDescription>
                {formatDate(payrun.day, payrun.month, payrun.year)}
              </CardDescription>
            </div>
            {getStatusBadge(payrun.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Employees</p>
              <p className="text-lg font-semibold">{payrun.totalEmployees}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gross Pay</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(Number(payrun.totalGrossPay))}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deductions</p>
              <p className="text-lg font-semibold text-red-600">
                {formatCurrency(Number(payrun.totalDeductions))}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Pay</p>
              <p className="text-lg font-semibold">
                {formatCurrency(Number(payrun.totalNetPay))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payrun Items</CardTitle>
          <CardDescription>
            Click on a row to view detailed breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Base Salary</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrun.items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">
                    {item.employeeName}
                  </TableCell>
                  <TableCell>{item.department || "-"}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(item.baseSalary))}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(Number(item.totalAllowances))}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(
                      Number(item.totalDeductions) + Number(item.totalTaxes),
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(Number(item.netPay))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={alertDialog.open}
        onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alertDialog.type === "approve"
                ? "Approve Payrun"
                : alertDialog.type === "complete"
                  ? "Mark as Paid"
                  : "Rollback Payrun"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialog.type === "approve"
                ? "Are you sure you want to approve this payrun? This will make it available for processing in Finance."
                : alertDialog.type === "complete"
                  ? "Are you sure you want to mark this payrun as paid? This will update loan balances and cannot be undone."
                  : "Are you sure you want to rollback this payrun? This action will delete the payrun and cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAlertConfirm}
              className={
                alertDialog.type === "rollback"
                  ? "bg-red-600 hover:bg-red-700"
                  : alertDialog.type === "complete"
                    ? "bg-green-600 hover:bg-green-700"
                    : ""
              }
            >
              {alertDialog.type === "approve"
                ? "Approve"
                : alertDialog.type === "complete"
                  ? "Mark as Paid"
                  : "Rollback"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
