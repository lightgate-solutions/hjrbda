/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use client";

import { useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, Clock, FileText } from "lucide-react";

export default function LeaveHistoryBalance() {
  // Get current employee
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee"],
    queryFn: async () => {
      const response = await fetch("/api/hr/employees/current");
      const data = await response.json();
      return data.employee;
    },
  });

  // Get leave history for current employee
  const { data: leaveHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["leave-history", currentEmployee?.id],
    queryFn: async () => {
      if (!currentEmployee?.id) return { leaves: [], total: 0 };
      const response = await fetch(
        `/api/hr/leaves?employeeId=${currentEmployee.id}&limit=10`,
      );
      const data = await response.json();
      return data;
    },
    enabled: !!currentEmployee?.id,
  });

  // Get annual leave balance
  const { data: leaveBalance, isLoading: isLoadingBalance } = useQuery({
    queryKey: ["leave-balance", currentEmployee?.id],
    queryFn: async () => {
      if (!currentEmployee?.id) return { balances: [] };
      const currentYear = new Date().getFullYear();
      const response = await fetch(
        `/api/hr/leaves/balances?employeeId=${currentEmployee.id}&year=${currentYear}`,
      );
      const data = await response.json();
      return data;
    },
    enabled: !!currentEmployee?.id,
  });

  const annualBalance = leaveBalance?.balances?.find(
    (b: any) => b.leaveType === "Annual",
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      Approved: "bg-green-500",
      Rejected: "bg-red-500",
      Pending: "bg-yellow-500",
      Cancelled: "bg-gray-500",
      "To be reviewed": "bg-orange-500",
    };
    return (
      <Badge className={variants[status] || "bg-gray-500"}>{status}</Badge>
    );
  };

  if (isLoadingHistory || isLoadingBalance) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading leave information...
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Annual Leave Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Annual Leave Balance
          </CardTitle>
          <CardDescription>
            Your annual leave allocation for {new Date().getFullYear()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {annualBalance ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Days</p>
                  <p className="text-2xl font-bold">
                    {annualBalance.totalDays}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Used Days</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {annualBalance.usedDays}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p
                    className={`text-2xl font-bold ${
                      annualBalance.remainingDays < 5
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {annualBalance.remainingDays}
                  </p>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{
                    width: `${
                      (annualBalance.remainingDays / annualBalance.totalDays) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <p>No annual leave balance found for this year.</p>
              <p className="text-sm mt-2">
                Contact HR to set up your annual leave allocation.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Leave Applications
          </CardTitle>
          <CardDescription>Your last 10 leave applications</CardDescription>
        </CardHeader>
        <CardContent>
          {leaveHistory?.leaves && leaveHistory.leaves.length > 0 ? (
            <div className="space-y-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveHistory.leaves.map((leave: any) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">
                        {leave.leaveType}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>
                            {format(new Date(leave.startDate), "MMM dd")}
                          </span>
                          <span className="text-muted-foreground">
                            to {format(new Date(leave.endDate), "MMM dd, yyyy")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {leave.totalDays} days
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(leave.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>No leave applications yet.</p>
              <p className="text-sm mt-2">
                Submit your first leave application using the form above.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
