"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
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
import { MoreHorizontal, Eye, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getApprovedPayruns, completePayrun } from "@/actions/payroll/payrun";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  allowanceName: string | null;
  day: number;
  month: number;
  year: number;
  totalEmployees: number;
  totalGrossPay: string;
  totalDeductions: string;
  totalNetPay: string;
  status: PayrunStatus | null;
  generatedByName: string | null;
  approvedAt: Date | null;
  createdAt: Date | null;
}

export function FinancePayrunTable() {
  const pathname = usePathname();
  const _router = useRouter();
  const queryClient = useQueryClient();
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean;
    payrunId: number;
    payrunName: string;
  }>({
    open: false,
    payrunId: 0,
    payrunName: "",
  });

  const { data: payruns, isLoading } = useQuery({
    queryKey: ["approved-payruns"],
    queryFn: getApprovedPayruns,
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => completePayrun(id, pathname),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        queryClient.invalidateQueries({ queryKey: ["approved-payruns"] });
      } else if (result.error) {
        toast.error(result.error.reason);
      }
    },
    onError: () => {
      toast.error("Failed to complete payrun");
    },
  });

  const getStatusBadge = (status: PayrunStatus | null) => {
    switch (status) {
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

  const formatDateTime = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleComplete = () => {
    completeMutation.mutate(alertDialog.payrunId);
    setAlertDialog({ ...alertDialog, open: false });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Payruns</CardTitle>
      </CardHeader>
      <CardContent>
        {payruns && payruns.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payruns.map((payrun: Payrun) => (
                  <TableRow key={payrun.id} className="group">
                    <TableCell className="font-medium">{payrun.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="capitalize font-normal"
                      >
                        {payrun.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(payrun.day, payrun.month, payrun.year)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {payrun.totalEmployees}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(Number(payrun.totalNetPay))}
                    </TableCell>
                    <TableCell>{getStatusBadge(payrun.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(payrun.approvedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
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
                          {payrun.status === "approved" && (
                            <DropdownMenuItem
                              onClick={() =>
                                setAlertDialog({
                                  open: true,
                                  payrunId: payrun.id,
                                  payrunName: payrun.name,
                                })
                              }
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No approved payruns pending disbursement
          </div>
        )}

        <AlertDialog
          open={alertDialog.open}
          onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark Payrun as Paid</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to mark &quot;{alertDialog.payrunName}
                &quot; as paid? This will update loan balances and cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleComplete}
                className="bg-green-600 hover:bg-green-700"
              >
                Mark as Paid
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
