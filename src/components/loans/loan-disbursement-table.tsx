/** biome-ignore-all lint/style/noNonNullAssertion: <> */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Eye, Banknote, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  getAllLoanApplications,
  getLoanApplicationById,
  disburseLoan,
} from "@/actions/loans/loans";
import LoanDetailsDialog from "./loan-details-dialog";

export default function LoanDisbursementTable() {
  const [selectedLoan, setSelectedLoan] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "disburse" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [filters, setFilters] = useState({
    status: "hr_approved",
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["finance-loans", filters, debouncedSearch, page],
    queryFn: () =>
      getAllLoanApplications({
        status: filters.status !== "all" ? filters.status : undefined,
        search: debouncedSearch || undefined,
        page,
        limit,
      }),
  });

  const { data: selectedLoanData } = useQuery({
    queryKey: ["loan-application", selectedLoan],
    queryFn: () => getLoanApplicationById(selectedLoan!),
    enabled: !!selectedLoan,
  });

  const disburseMutation = useMutation({
    mutationFn: () =>
      disburseLoan({
        applicationId: selectedLoan!,
        remarks,
      }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        setSelectedLoan(null);
        setViewMode(null);
        setRemarks("");
        queryClient.invalidateQueries({ queryKey: ["finance-loans"] });
      } else {
        toast.error(result.error?.reason || "Failed to disburse loan");
      }
    },
    onError: () => {
      toast.error("An error occurred. Please try again.");
    },
  });

  const applications = data?.applications || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "hr_approved":
        return <Badge className="bg-blue-500">Awaiting Disbursement</Badge>;
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "completed":
        return <Badge className="bg-gray-500">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "NGN",
    }).format(Number(amount));
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading loans awaiting disbursement...
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <Card className="p-4 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Loan Disbursement</CardTitle>
              <CardDescription>
                Review and disburse approved loans
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or reference..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filters.status}
                onValueChange={(value) => {
                  setFilters({ ...filters, status: value });
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hr_approved">
                    Awaiting Disbursement
                  </SelectItem>
                  <SelectItem value="active">Active Loans</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {applications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No loans found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Loan Type</TableHead>
                  <TableHead>Approved Amount</TableHead>
                  <TableHead>Monthly Deduction</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>HR Approved</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-mono text-sm">
                      {loan.referenceNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{loan.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {loan.employeeDepartment}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{loan.loanTypeName}</TableCell>
                    <TableCell>{formatCurrency(loan.approvedAmount)}</TableCell>
                    <TableCell>
                      {formatCurrency(loan.monthlyDeduction)}
                    </TableCell>
                    <TableCell>{getStatusBadge(loan.status)}</TableCell>
                    <TableCell>{formatDate(loan.hrReviewedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLoan(loan.id);
                            setViewMode("view");
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {loan.status === "hr_approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedLoan(loan.id);
                              setViewMode("disburse");
                            }}
                          >
                            <Banknote className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={
                        page === 1 ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        (p >= page - 1 && p <= page + 1),
                    )
                    .map((p, idx, arr) => (
                      <div key={p} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <PaginationItem>
                            <span className="px-2">...</span>
                          </PaginationItem>
                        )}
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => setPage(p)}
                            isActive={p === page}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      </div>
                    ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      className={
                        page === totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <div className="mt-2 text-sm text-muted-foreground text-center">
                Showing {applications.length > 0 ? (page - 1) * limit + 1 : 0}{" "}
                to {Math.min(page * limit, total)} of {total} results
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Loan Details Dialog */}
      <Dialog
        open={!!selectedLoan && viewMode === "view"}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLoan(null);
            setViewMode(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loan Details</DialogTitle>
            <DialogDescription>
              View loan application details and bank information
            </DialogDescription>
          </DialogHeader>
          {selectedLoanData && <LoanDetailsDialog loan={selectedLoanData} />}
        </DialogContent>
      </Dialog>

      {/* Disburse Loan Dialog */}
      <Dialog
        open={!!selectedLoan && viewMode === "disburse"}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLoan(null);
            setViewMode(null);
            setRemarks("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Disburse Loan</DialogTitle>
            <DialogDescription>
              Confirm loan disbursement to employee bank account
            </DialogDescription>
          </DialogHeader>

          {selectedLoanData && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Employee</p>
                    <p className="font-medium">
                      {selectedLoanData.employeeName}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium">
                      {formatCurrency(selectedLoanData.approvedAmount)}
                    </p>
                  </div>
                </div>

                {selectedLoanData.bankDetails ? (
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm font-medium mb-2">Bank Details</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Bank</p>
                        <p className="font-medium">
                          {selectedLoanData.bankDetails.bankName}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Account</p>
                        <p className="font-medium">
                          {selectedLoanData.bankDetails.accountNumber}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Account Name</p>
                        <p className="font-medium">
                          {selectedLoanData.bankDetails.accountName}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm text-destructive">
                      No bank details on file for this employee
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Disbursement Remarks</Label>
                <Textarea
                  id="remarks"
                  placeholder="Add any remarks about the disbursement..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedLoan(null);
                setViewMode(null);
                setRemarks("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => disburseMutation.mutate()}
              disabled={disburseMutation.isPending}
            >
              {disburseMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Disbursement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
