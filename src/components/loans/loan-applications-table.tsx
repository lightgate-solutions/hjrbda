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
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Eye, CheckCircle2, Search, Plus, XCircle } from "lucide-react";
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
import {
  getAllLoanApplications,
  getLoanApplicationById,
  cancelLoanApplication,
} from "@/actions/loans/loans";
import LoanApplicationForm from "./loan-application-form";
import LoanReviewDialog from "./loan-review-dialog";
import LoanDetailsDialog from "./loan-details-dialog";

interface LoanApplicationsTableProps {
  employeeId?: number;
  isHR?: boolean;
  showFilters?: boolean;
}

export default function LoanApplicationsTable({
  employeeId,
  isHR = false,
  showFilters = true,
}: LoanApplicationsTableProps) {
  const [selectedLoan, setSelectedLoan] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "review" | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
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
    queryKey: ["loan-applications", employeeId, filters, debouncedSearch, page],
    queryFn: () =>
      getAllLoanApplications({
        employeeId,
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

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      cancelLoanApplication(id, reason),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        queryClient.invalidateQueries({ queryKey: ["loan-applications"] });
      } else {
        toast.error(result.error?.reason || "Failed to cancel");
      }
    },
  });

  const applications = data?.applications || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

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
        Loading loan applications...
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <Card className="p-4 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Loan Applications</CardTitle>
              <CardDescription>
                {isHR
                  ? "Review and manage employee loan applications"
                  : "View and apply for loans"}
              </CardDescription>
            </div>
            <Button onClick={() => setShowApplyForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Apply for Loan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showFilters && (
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
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="hr_approved">HR Approved</SelectItem>
                    <SelectItem value="hr_rejected">Rejected</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {applications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No loan applications found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  {isHR && <TableHead>Employee</TableHead>}
                  <TableHead>Loan Type</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-mono text-sm">
                      {loan.referenceNumber}
                    </TableCell>
                    {isHR && (
                      <TableCell>
                        <div>
                          <p className="font-medium">{loan.employeeName}</p>
                          <p className="text-xs text-muted-foreground">
                            {loan.employeeDepartment}
                          </p>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>{loan.loanTypeName}</TableCell>
                    <TableCell>
                      {formatCurrency(loan.requestedAmount)}
                    </TableCell>
                    <TableCell>
                      {loan.approvedAmount
                        ? formatCurrency(loan.approvedAmount)
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(loan.status)}</TableCell>
                    <TableCell>{formatDate(loan.appliedAt)}</TableCell>
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
                        {isHR && loan.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedLoan(loan.id);
                              setViewMode("review");
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {!isHR &&
                          ["pending", "hr_approved"].includes(loan.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Are you sure you want to cancel this application?",
                                  )
                                ) {
                                  cancelMutation.mutate({
                                    id: loan.id,
                                  });
                                }
                              }}
                            >
                              <XCircle className="h-4 w-4" />
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

      {/* Apply Loan Dialog */}
      <Dialog open={showApplyForm} onOpenChange={setShowApplyForm}>
        <DialogContent className="max-w-2xl max-h-11/12 overflow-auto">
          <DialogHeader>
            <DialogTitle>Apply for Loan</DialogTitle>
            <DialogDescription>Submit a new loan application</DialogDescription>
          </DialogHeader>
          <LoanApplicationForm
            employeeId={employeeId}
            onSuccess={() => {
              setShowApplyForm(false);
              queryClient.invalidateQueries({
                queryKey: ["loan-applications"],
              });
            }}
            onCancel={() => setShowApplyForm(false)}
          />
        </DialogContent>
      </Dialog>

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
              View loan application details and history
            </DialogDescription>
          </DialogHeader>
          {selectedLoanData && <LoanDetailsDialog loan={selectedLoanData} />}
        </DialogContent>
      </Dialog>

      {/* Review Loan Dialog */}
      <Dialog
        open={!!selectedLoan && viewMode === "review"}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLoan(null);
            setViewMode(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-11/12 overflow-auto">
          <DialogHeader>
            <DialogTitle>Review Loan Application</DialogTitle>
            <DialogDescription>
              Approve or reject this loan application
            </DialogDescription>
          </DialogHeader>
          {selectedLoanData && (
            <LoanReviewDialog
              loan={selectedLoanData}
              onSuccess={() => {
                setSelectedLoan(null);
                setViewMode(null);
                queryClient.invalidateQueries({
                  queryKey: ["loan-applications"],
                });
              }}
              onCancel={() => {
                setSelectedLoan(null);
                setViewMode(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
