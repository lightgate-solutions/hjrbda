"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { BalanceUpdateDialog } from "./balance-update-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function BalanceCard() {
  const [balance, setBalance] = useState<string>("0");
  const [currency, setCurrency] = useState<string>("NGN");
  const [loading, setLoading] = useState(true);

  const loadBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/balance");
      const data = await res.json();
      setBalance(data.balance?.balance || "0");
      setCurrency(data.balance?.currency || "NGN");
    } catch (_error) {
      toast.error("Error loading balance:");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
    // Refresh balance when expenses change
    const handleExpenseChange = () => {
      loadBalance();
    };
    window.addEventListener("expenses:changed", handleExpenseChange);
    return () => {
      window.removeEventListener("expenses:changed", handleExpenseChange);
    };
  }, [loadBalance]);

  const formatCurrency = (amount: string) => {
    const num = Number(amount);
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency,
    }).format(num);
  };

  const balanceNum = Number(balance);
  const isNegative = balanceNum < 0;

  return (
    <Card className="overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium">Company Balance</CardTitle>
        <Wallet className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="relative z-10">
        {loading ? (
          <div className="text-2xl font-bold animate-pulse bg-muted h-8 w-32 rounded" />
        ) : (
          <div className="flex items-baseline gap-2">
            <div
              className={cn(
                "text-2xl font-bold",
                isNegative
                  ? "text-red-600 dark:text-red-400"
                  : "text-foreground",
              )}
            >
              {formatCurrency(balance)}
            </div>
            {isNegative ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-green-500" />
            )}
          </div>
        )}
        <div className="flex flex-col items-start gap-2 justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            Current available funds
          </p>
          <div className="flex gap-2">
            <BalanceUpdateDialog
              onCompleted={loadBalance}
              trigger={
                <Button size="sm" className="h-7 text-xs shadow-sm">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Funds
                </Button>
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
