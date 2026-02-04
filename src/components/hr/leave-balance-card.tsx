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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function LeaveBalanceCard({
  employeeId,
  year,
}: {
  employeeId: number;
  year?: number;
}) {
  const currentYear = year || new Date().getFullYear();

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ["leave-balances", employeeId, currentYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("employeeId", employeeId.toString());
      if (year) params.append("year", year.toString());

      const response = await fetch(
        `/api/hr/leaves/balances?${params.toString()}`,
      );
      const data = await response.json();
      return data.balances || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Balance</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (balances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Balance</CardTitle>
          <CardDescription>Year {currentYear}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No leave balance information available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Balance</CardTitle>
        <CardDescription>Year {currentYear}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {balances.map((balance: any) => {
          const percentage =
            balance.totalDays > 0
              ? (balance.usedDays / balance.totalDays) * 100
              : 0;

          return (
            <div key={balance.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{balance.leaveType}</p>
                  <p className="text-sm text-muted-foreground">
                    {balance.remainingDays} days remaining
                  </p>
                </div>
                <Badge variant="outline">
                  {balance.usedDays} / {balance.totalDays} days
                </Badge>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
