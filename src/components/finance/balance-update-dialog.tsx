"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type Props = {
  trigger: React.ReactNode;
  onCompleted?: () => void;
};

export function BalanceUpdateDialog({ trigger, onCompleted }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "set">("add");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState<string>("0");

  const loadBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/balance");
      const data = await res.json();
      setBalance(data.balance?.balance || "0");
    } catch (_error) {
      toast.error("Error loading balance:");
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadBalance();
    }
  }, [open, loadBalance]);

  async function onSubmit() {
    if (!amount || Number(amount) < 0) {
      alert("Amount must be greater than or equal to 0");
      return;
    }

    setSaving(true);
    try {
      const payload =
        mode === "add"
          ? { addAmount: Number(amount) }
          : { balance: Number(amount) };

      await fetch("/api/finance/balance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setOpen(false);
      setAmount("");
      setMode("add");
      onCompleted?.();
      // Notify balance card to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("expenses:changed"));
      }
    } catch (_error) {
      toast.error("Error updating balance:");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (open) {
      setAmount("");
      setMode("add");
    }
  }, [open]);

  const formatCurrency = (amount: string) => {
    const num = Number(amount);
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(num);
  };

  const currentBalanceNum = Number(balance);
  const amountNum = Number(amount) || 0;
  const newBalance = mode === "add" ? currentBalanceNum + amountNum : amountNum;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Company Balance</DialogTitle>
          <DialogDescription>
            Current balance: <strong>{formatCurrency(balance)}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "add" | "set")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add">Add Funds</TabsTrigger>
              <TabsTrigger value="set">Set Balance</TabsTrigger>
            </TabsList>
            <TabsContent value="add" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount to Add *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the amount to add to the current balance
                </p>
              </div>
              {amount && amountNum > 0 && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    New balance will be:{" "}
                    <strong>{formatCurrency(newBalance.toString())}</strong>
                  </p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="set" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="newBalance">New Balance *</Label>
                <Input
                  id="newBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={balance}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the exact balance amount (use this to correct mistakes)
                </p>
              </div>
              {amount && amountNum >= 0 && (
                <div className="p-3 bg-muted rounded-md space-y-1">
                  <p className="text-sm">
                    New balance will be:{" "}
                    <strong>{formatCurrency(newBalance.toString())}</strong>
                  </p>
                  {amountNum !== currentBalanceNum && (
                    <p className="text-xs text-muted-foreground">
                      {amountNum > currentBalanceNum
                        ? `Increase of ${formatCurrency(
                            (amountNum - currentBalanceNum).toString(),
                          )}`
                        : `Decrease of ${formatCurrency(
                            (currentBalanceNum - amountNum).toString(),
                          )}`}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={saving}>
            {saving
              ? mode === "add"
                ? "Adding..."
                : "Setting..."
              : mode === "add"
                ? "Add to Balance"
                : "Set Balance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
