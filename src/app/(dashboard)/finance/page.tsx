"use client";

import { useEffect, useState, useCallback } from "react";
import { BalanceCard } from "@/components/finance/balance-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowDownLeft,
  CreditCard,
  Plus,
  FileText,
  Receipt,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DatePickerWithRange } from "@/components/finance/date-range-picker";
import { FinanceChart } from "@/components/finance/finance-chart";
import type { DateRange } from "react-day-picker";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { BalanceUpdateDialog } from "@/components/finance/balance-update-dialog";

export default function FinancePage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalExpenses: "0",
    activeLoans: 0,
    chartData: [],
  });
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (date?.from) params.append("from", date.from.toISOString());
      if (date?.to) params.append("to", date.to.toISOString());

      const res = await fetch(`/api/finance/stats?${params.toString()}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStats({
        totalExpenses: data.totalExpenses || "0",
        activeLoans: data.activeLoans || 0,
        chartData: data.chartData || [],
      });
    } catch (error) {
      console.error("Error fetching finance stats:", error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Finance Overview
          </h2>
          <p className="text-muted-foreground">
            Manage your company finances, expenses, and payruns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DatePickerWithRange date={date} setDate={setDate} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <BalanceCard />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(Number(stats.totalExpenses))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {date?.from ? "In selected period" : "Lifetime expenses"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold">{stats.activeLoans}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {stats.activeLoans === 0
                ? "No active loans"
                : `${stats.activeLoans} active loan${stats.activeLoans === 1 ? "" : "s"}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <FinanceChart data={stats.chartData} loading={loading} />

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <BalanceUpdateDialog
              onCompleted={() => {
                fetchStats();
                // Trigger balance refresh event for BalanceCard
                window.dispatchEvent(new Event("expenses:changed"));
              }}
              trigger={
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4 px-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="font-semibold">Add Funds</span>
                      <span className="text-xs text-muted-foreground">
                        Top up company balance
                      </span>
                    </div>
                  </div>
                </Button>
              }
            />

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4 px-4"
              onClick={() => router.push("/finance/payruns")}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="font-semibold">Payruns</span>
                  <span className="text-xs text-muted-foreground">
                    Manage employee payments
                  </span>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4 px-4"
              onClick={() => router.push("/finance/expenses")}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="font-semibold">Expenses</span>
                  <span className="text-xs text-muted-foreground">
                    Record and track expenses
                  </span>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
