"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LoanDetailsDialogProps {
  loan: {
    id: number;
    referenceNumber: string;
    employeeName: string | null;
    employeeEmail: string | null;
    employeeDepartment: string | null;
    employeeStaffNumber: string | null;
    loanTypeName: string | null;
    requestedAmount: string;
    approvedAmount: string | null;
    monthlyDeduction: string | null;
    tenureMonths: number;
    reason: string;
    status: string;
    hrReviewerName: string | null;
    hrReviewedAt: Date | null;
    hrRemarks: string | null;
    disburserName: string | null;
    disbursedAt: Date | null;
    disbursementRemarks: string | null;
    totalRepaid: string;
    remainingBalance: string;
    appliedAt: Date;
    completedAt: Date | null;
    bankDetails?: {
      bankName: string;
      accountName: string;
      accountNumber: string;
    } | null;
    salaryInfo?: {
      structureName: string;
      baseSalary: string;
    } | null;
    history: Array<{
      id: number;
      action: string;
      description: string;
      performerName: string | null;
      createdAt: Date;
    }>;
    repayments: Array<{
      id: number;
      installmentNumber: number;
      dueDate: Date;
      expectedAmount: string;
      paidAmount: string;
      balanceAfter: string | null;
      status: string;
      paidAt: Date | null;
    }>;
  };
}

export default function LoanDetailsDialog({ loan }: LoanDetailsDialogProps) {
  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string | Date | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "NGN",
    }).format(Number(amount));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "hr_approved":
        return <Badge className="bg-blue-500">HR Approved</Badge>;
      case "hr_rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "disbursed":
        return <Badge className="bg-purple-500">Disbursed</Badge>;
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "completed":
        return <Badge className="bg-gray-500">Completed</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      case "paid":
        return <Badge className="bg-green-500">Paid</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <ScrollArea className="max-h-[70vh]">
      <div className="space-y-6 pr-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Reference Number</p>
            <p className="font-mono font-medium">{loan.referenceNumber}</p>
          </div>
          {getStatusBadge(loan.status)}
        </div>

        <Separator />

        {/* Employee Info */}
        <div>
          <h4 className="font-medium mb-3">Employee Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{loan.employeeName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Staff Number</p>
              <p className="font-medium">{loan.employeeStaffNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{loan.employeeEmail}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Department</p>
              <p className="font-medium">{loan.employeeDepartment}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Loan Details */}
        <div>
          <h4 className="font-medium mb-3">Loan Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Loan Type</p>
              <p className="font-medium">{loan.loanTypeName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tenure</p>
              <p className="font-medium">{loan.tenureMonths} months</p>
            </div>
            <div>
              <p className="text-muted-foreground">Requested Amount</p>
              <p className="font-medium">
                {formatCurrency(loan.requestedAmount)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Approved Amount</p>
              <p className="font-medium">
                {formatCurrency(loan.approvedAmount)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Monthly Deduction</p>
              <p className="font-medium">
                {formatCurrency(loan.monthlyDeduction)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Applied On</p>
              <p className="font-medium">{formatDate(loan.appliedAt)}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-muted-foreground text-sm">Reason</p>
            <p className="text-sm mt-1">{loan.reason}</p>
          </div>
        </div>

        {/* Salary Info */}
        {loan.salaryInfo && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Salary Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Salary Structure</p>
                  <p className="font-medium">{loan.salaryInfo.structureName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Base Salary</p>
                  <p className="font-medium">
                    {formatCurrency(loan.salaryInfo.baseSalary)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Bank Details */}
        {loan.bankDetails && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Bank Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Bank Name</p>
                  <p className="font-medium">{loan.bankDetails.bankName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Account Name</p>
                  <p className="font-medium">{loan.bankDetails.accountName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Account Number</p>
                  <p className="font-medium">
                    {loan.bankDetails.accountNumber}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Repayment Progress */}
        {(loan.status === "active" || loan.status === "completed") && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Repayment Progress</h4>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-muted-foreground">Total Repaid</p>
                  <p className="font-medium text-green-600">
                    {formatCurrency(loan.totalRepaid)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining Balance</p>
                  <p className="font-medium text-orange-600">
                    {formatCurrency(loan.remainingBalance)}
                  </p>
                </div>
              </div>

              {loan.repayments.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loan.repayments.slice(0, 6).map((repayment) => (
                      <TableRow key={repayment.id}>
                        <TableCell>{repayment.installmentNumber}</TableCell>
                        <TableCell>{formatDate(repayment.dueDate)}</TableCell>
                        <TableCell>
                          {formatCurrency(repayment.expectedAmount)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(repayment.paidAmount)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(repayment.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}

        {/* HR Review */}
        {loan.hrReviewedAt && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">HR Review</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Reviewed By</p>
                  <p className="font-medium">{loan.hrReviewerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reviewed At</p>
                  <p className="font-medium">
                    {formatDateTime(loan.hrReviewedAt)}
                  </p>
                </div>
              </div>
              {loan.hrRemarks && (
                <div className="mt-2">
                  <p className="text-muted-foreground text-sm">Remarks</p>
                  <p className="text-sm mt-1">{loan.hrRemarks}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Finance Disbursement */}
        {loan.disbursedAt && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Disbursement</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Disbursed By</p>
                  <p className="font-medium">{loan.disburserName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Disbursed At</p>
                  <p className="font-medium">
                    {formatDateTime(loan.disbursedAt)}
                  </p>
                </div>
              </div>
              {loan.disbursementRemarks && (
                <div className="mt-2">
                  <p className="text-muted-foreground text-sm">Remarks</p>
                  <p className="text-sm mt-1">{loan.disbursementRemarks}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* History */}
        {loan.history.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">History</h4>
              <div className="space-y-3">
                {loan.history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                    <div className="flex-1">
                      <p>{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.performerName} -{" "}
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
