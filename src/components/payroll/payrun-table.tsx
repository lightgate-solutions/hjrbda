/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Plus,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  getPayruns,
  approvePayrun,
  rollbackPayrun,
} from "@/actions/payroll/payrun";
import { PayrunGenerateDialog } from "./payrun-generate-dialog";
import { toast } from "sonner";

type PayrunStatus =
  | "draft"
  | "pending"
  | "processing"
  | "completed"
  | "approved"
  | "paid"
  | "archived";

interface Payrun {
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
}

export function PayrunTable() {
  const pathname = usePathname();
  const _router = useRouter();
  const queryClient = useQueryClient();
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean;
    type: "approve" | "rollback";
    payrunId: number;
    payrunName: string;
  }>({
    open: false,
    type: "approve",
    payrunId: 0,
    payrunName: "",
  });

  const { data: payruns, isLoading } = useQuery({
    queryKey: ["payruns"],
    queryFn: getPayruns,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => approvePayrun(id, pathname),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        queryClient.invalidateQueries({ queryKey: ["payruns"] });
      } else if (result.error) {
        toast.error(result.error.reason);
      }
    },
    onError: () => {
      toast.error("Failed to approve payrun");
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: (id: number) => rollbackPayrun(id, pathname),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        queryClient.invalidateQueries({ queryKey: ["payruns"] });
      } else if (result.error) {
        toast.error(result.error.reason);
      }
    },
    onError: () => {
      toast.error("Failed to rollback payrun");
    },
  });

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
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  const formatDate = (_day: number, month: number, year: number) => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[month - 1]} ${year}`;
  };

  const handleAlertConfirm = () => {
    if (alertDialog.type === "approve") {
      approveMutation.mutate(alertDialog.payrunId);
    } else if (alertDialog.type === "rollback") {
      rollbackMutation.mutate(alertDialog.payrunId);
    }
    setAlertDialog({ ...alertDialog, open: false });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setGenerateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Payrun
        </Button>
      </div>

      {payruns && payruns.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Employees</TableHead>
              <TableHead className="text-right">Gross Pay</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">Net Pay</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payruns.map((payrun: Payrun) => (
              <TableRow key={payrun.id}>
                <TableCell className="font-medium">{payrun.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {payrun.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatDate(payrun.day, payrun.month, payrun.year)}
                </TableCell>
                <TableCell className="text-right">
                  {payrun.totalEmployees}
                </TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(Number(payrun.totalGrossPay))}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(Number(payrun.totalDeductions))}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(Number(payrun.totalNetPay))}
                </TableCell>
                <TableCell>{getStatusBadge(payrun.status)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/payroll/payrun/${payrun.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/payroll/payrun/${payrun.id}?export=pdf`}>
                          <FileText className="mr-2 h-4 w-4" />
                          Export PDF
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/payroll/payrun/${payrun.id}?export=csv`}>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Export CSV
                        </Link>
                      </DropdownMenuItem>
                      {(payrun.status === "draft" ||
                        payrun.status === "pending") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setAlertDialog({
                                open: true,
                                type: "approve",
                                payrunId: payrun.id,
                                payrunName: payrun.name,
                              })
                            }
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setAlertDialog({
                                open: true,
                                type: "rollback",
                                payrunId: payrun.id,
                                payrunName: payrun.name,
                              })
                            }
                            className="text-red-600"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Rollback
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No payruns found. Generate a new payrun to get started.
        </div>
      )}

      <PayrunGenerateDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
      />

      <AlertDialog
        open={alertDialog.open}
        onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alertDialog.type === "approve"
                ? "Approve Payrun"
                : "Rollback Payrun"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialog.type === "approve"
                ? `Are you sure you want to approve "${alertDialog.payrunName}"? This will make it available for processing in Finance.`
                : `Are you sure you want to rollback "${alertDialog.payrunName}"? This action will delete the payrun and cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAlertConfirm}
              className={
                alertDialog.type === "rollback"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {alertDialog.type === "approve" ? "Approve" : "Rollback"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
