/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createDeduction, updateDeduction } from "@/actions/payroll/deductions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { deductionTypeEnum } from "@/db/schema/payroll";

type DeductionType = (typeof deductionTypeEnum.enumValues)[number];

type Props = {
  trigger?: React.ReactNode;
  initial?: {
    id: number;
    name: string;
    type: DeductionType;
    percentage?: string;
    amount?: string;
    description?: string;
  } | null;
  isOpen?: boolean;
  onOpenChangeAction?: (open: boolean) => void;
  onCompleteAction?: () => void;
};

export function DeductionFormDialog({
  trigger,
  initial,
  isOpen,
  onOpenChangeAction,
  onCompleteAction,
}: Props) {
  const [open, setOpen] = useState(isOpen || false);
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<DeductionType>(initial?.type ?? "recurring");
  const [percentage, setPercentage] = useState(initial?.percentage ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [calculationType, setCalculationType] = useState(
    initial?.percentage ? "percentage" : "fixed",
  );

  useEffect(() => {
    if (typeof isOpen !== "undefined") {
      setOpen(isOpen);
    }
  }, [isOpen]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChangeAction?.(newOpen);
  };

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setType(initial?.type ?? "recurring");
    setPercentage(initial?.percentage ?? "");
    setAmount(initial?.amount ?? "");
    setDescription(initial?.description ?? "");
    setCalculationType(initial?.percentage ? "percentage" : "fixed");
  }, [initial, open]);

  async function onSubmit() {
    if (!name.trim()) {
      toast.error("Deduction name is required");
      return;
    }

    if (calculationType === "percentage") {
      if (!percentage || Number(percentage) <= 0) {
        toast.error("Percentage must be greater than 0");
        return;
      }
    } else {
      if (!amount || Number(amount) <= 0) {
        toast.error("Amount must be greater than 0");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        type,
        description: description?.trim() || "",
      };

      if (calculationType === "percentage") {
        payload.percentage = Number(percentage);
        payload.amount = undefined;
      } else {
        payload.amount = Number(amount);
        payload.percentage = undefined;
      }

      let result: {
        error: { reason: string } | null;
        success: { reason: string } | null;
      };

      if (initial?.id) {
        result = await updateDeduction(
          initial.id,
          payload,
          window.location.pathname,
        );
      } else {
        result = await createDeduction(payload, window.location.pathname);
      }

      if (result.error) {
        toast.error(result.error.reason);
      } else if (result.success) {
        toast.success(result.success.reason);
        handleOpenChange(false);
        onCompleteAction?.();
      }
    } catch (_error) {
      toast.error("Failed to save deduction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-11/12 overflow-x-auto">
        <DialogHeader>
          <DialogTitle>
            {initial?.id ? "Edit Deduction" : "New Deduction"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Deduction Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Income Tax"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as DeductionType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recurring">Recurring</SelectItem>
                <SelectItem value="one-time">One-time</SelectItem>
                <SelectItem value="statutory">Statutory</SelectItem>
                <SelectItem value="loan">Loan</SelectItem>
                <SelectItem value="advance">Advance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Calculation Method *</Label>
            <Select value={calculationType} onValueChange={setCalculationType}>
              <SelectTrigger>
                <SelectValue placeholder="Select calculation method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">
                  Percentage of Base Salary
                </SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {calculationType === "percentage" ? (
            <div className="grid gap-2">
              <Label htmlFor="percentage">Percentage of Base Salary *</Label>
              <Input
                id="percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="e.g., 10.00"
              />
              <p className="text-xs text-muted-foreground">
                Enter percentage (0-100) of base salary
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="amount">Fixed Amount (NGN) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., 5000.00"
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description || ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter deduction description"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={saving}>
            {saving
              ? "Saving..."
              : initial?.id
                ? "Save changes"
                : "Create deduction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
