/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { deleteLeaveApplication } from "@/actions/hr/leaves";
import { toast } from "sonner";
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
import {
  Eye,
  CheckCircle2,
  Calendar,
  Search,
  Pencil,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import LeaveApplicationForm from "./leave-application-form";
import LeaveApprovalDialog from "./leave-approval-dialog";
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

export default function LeavesTable({
  employeeId,
  isHR = false,
  showFilters = true,
}: {
  employeeId?: number;
  isHR?: boolean;
  showFilters?: boolean;
}) {
  const [selectedLeave, setSelectedLeave] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "approve" | "edit" | null>(
    null,
  );
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    leaveType: "all",
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteLeaveApplication(id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Leave application deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["leaves"] });
      } else {
        toast.error(
          result.error.reason || "Failed to delete leave application",
        );
      }
    },
    onError: () => {
      toast.error("An error occurred while deleting");
    },
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["leaves", employeeId, filters, debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (employeeId) params.append("employeeId", employeeId.toString());
      if (filters.status && filters.status !== "all")
        params.append("status", filters.status);
      if (filters.leaveType && filters.leaveType !== "all")
        params.append("leaveType", filters.leaveType);
      if (debouncedSearch) params.append("search", debouncedSearch);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const response = await fetch(`/api/hr/leaves?${params.toString()}`);
      const data = await response.json();
      return data;
    },
  });

  const leaves = data?.leaves || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "Rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "Pending":
        return <Badge variant="outline">Pending</Badge>;
      case "Cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      case "To be reviewed":
        return <Badge className="bg-yellow-500">To be reviewed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading leave applications...
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <Card className="p-4 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Leave Applications</CardTitle>
              <CardDescription>
                {isHR
                  ? "Review and manage employee leave applications"
                  : "View and apply for leaves"}
              </CardDescription>
            </div>
            <Button onClick={() => setShowApplyForm(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              Apply for Leave
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
                    placeholder="Search by employee name or email..."
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
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="To be reviewed">
                      To be reviewed
                    </SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.leaveType}
                  onValueChange={(value) => {
                    setFilters({ ...filters, leaveType: value });
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Annual">Annual</SelectItem>
                    <SelectItem value="Sick">Sick</SelectItem>
                    <SelectItem value="Personal">Personal</SelectItem>
                    <SelectItem value="Maternity">Maternity</SelectItem>
                    <SelectItem value="Paternity">Paternity</SelectItem>
                    <SelectItem value="Bereavement">Bereavement</SelectItem>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {leaves.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No leave applications found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isHR && <TableHead>Employee</TableHead>}
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((leave: any) => (
                  <TableRow key={leave.id}>
                    {isHR && (
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {leave.employeeName || "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {leave.employeeEmail || "N/A"}
                          </p>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline">{leave.leaveType}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(leave.startDate)}</TableCell>
                    <TableCell>{formatDate(leave.endDate)}</TableCell>
                    <TableCell>{leave.totalDays} days</TableCell>
                    <TableCell>{getStatusBadge(leave.status)}</TableCell>
                    <TableCell>{formatDate(leave.appliedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLeave(leave);
                            setViewMode("view");
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isHR &&
                          (leave.status === "Pending" ||
                            leave.status === "To be reviewed") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedLeave(leave);
                                setViewMode("approve");
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                        {!isHR && leave.status === "Pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedLeave(leave);
                                setViewMode("edit");
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Are you sure you want to delete this leave application?",
                                  )
                                ) {
                                  deleteMutation.mutate(leave.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
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
                Showing {leaves.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
                {Math.min(page * limit, total)} of {total} results
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply Leave Dialog */}
      <Dialog open={showApplyForm} onOpenChange={setShowApplyForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>
              Submit a new leave application
            </DialogDescription>
          </DialogHeader>
          <LeaveApplicationForm
            employeeId={employeeId}
            onSuccess={() => {
              setShowApplyForm(false);
              queryClient.invalidateQueries({ queryKey: ["leaves"] });
            }}
            onCancel={() => setShowApplyForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* View/Approve/Edit Leave Dialog */}
      <Dialog
        open={!!selectedLeave && !!viewMode}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLeave(null);
            setViewMode(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {viewMode === "view"
                ? "Leave Details"
                : viewMode === "edit"
                  ? "Edit Leave Application"
                  : "Approve/Reject Leave"}
            </DialogTitle>
            <DialogDescription>
              {viewMode === "view"
                ? "View leave application details"
                : viewMode === "edit"
                  ? "Update your leave application"
                  : "Review and approve or reject this leave application"}
            </DialogDescription>
          </DialogHeader>

          {viewMode === "view" && selectedLeave && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Employee
                  </p>
                  <p className="text-sm">{selectedLeave.employeeName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Leave Type
                  </p>
                  <p className="text-sm">{selectedLeave.leaveType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Start Date
                  </p>
                  <p className="text-sm">
                    {formatDate(selectedLeave.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    End Date
                  </p>
                  <p className="text-sm">{formatDate(selectedLeave.endDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Days
                  </p>
                  <p className="text-sm">{selectedLeave.totalDays} days</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  <div className="mt-1">
                    {getStatusBadge(selectedLeave.status)}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Reason
                </p>
                <p className="mt-1 text-sm">{selectedLeave.reason}</p>
              </div>
              {selectedLeave.approverName && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Approved By
                  </p>
                  <p className="text-sm">{selectedLeave.approverName}</p>
                </div>
              )}
              {(selectedLeave.rejectionReason ||
                selectedLeave.status === "To be reviewed") && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {selectedLeave.status === "To be reviewed"
                      ? "Review Reason"
                      : "Rejection Reason"}
                  </p>
                  <p
                    className={`text-sm ${selectedLeave.status === "To be reviewed" ? "text-yellow-600" : "text-destructive"}`}
                  >
                    {selectedLeave.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          )}

          {viewMode === "approve" && selectedLeave && (
            <LeaveApprovalDialog
              leave={selectedLeave}
              onSuccess={() => {
                setSelectedLeave(null);
                setViewMode(null);
                queryClient.invalidateQueries({ queryKey: ["leaves"] });
              }}
              onCancel={() => {
                setSelectedLeave(null);
                setViewMode(null);
              }}
            />
          )}

          {viewMode === "edit" && selectedLeave && (
            <LeaveApplicationForm
              employeeId={employeeId}
              leaveToEdit={selectedLeave}
              onSuccess={() => {
                setSelectedLeave(null);
                setViewMode(null);
                queryClient.invalidateQueries({ queryKey: ["leaves"] });
              }}
              onCancel={() => {
                setSelectedLeave(null);
                setViewMode(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
