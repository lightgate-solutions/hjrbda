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
import { createAllowance, updateAllowance } from "@/actions/payroll/allowances";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { allowanceTypeEnum } from "@/db/schema/payroll";

type AllowanceType = (typeof allowanceTypeEnum.enumValues)[number];

type Props = {
  trigger?: React.ReactNode;
  initial?: {
    id: number;
    name: string;
    type: AllowanceType;
    percentage?: string;
    amount?: string;
    taxable: boolean;
    taxPercentage?: string;
    description: string;
  } | null;
  isOpen?: boolean;
  onOpenChangeAction?: (open: boolean) => void;
  onCompleteAction?: () => void;
};

export function AllowanceFormDialog({
  trigger,
  initial,
  isOpen,
  onOpenChangeAction,
  onCompleteAction,
}: Props) {
  const [open, setOpen] = useState(isOpen || false);
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AllowanceType>(initial?.type ?? "one-time");
  const [percentage, setPercentage] = useState(initial?.percentage ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [taxable, setTaxable] = useState(initial?.taxable ?? false);
  const [taxPercentage, setTaxPercentage] = useState(
    initial?.taxPercentage ?? "",
  );
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
    setType(initial?.type ?? "one-time");
    setPercentage(initial?.percentage ?? "");
    setAmount(initial?.amount ?? "");
    setTaxable(initial?.taxable ?? false);
    setTaxPercentage(initial?.taxPercentage ?? "");
    setDescription(initial?.description ?? "");
    setCalculationType(initial?.percentage ? "percentage" : "fixed");
  }, [initial, open]);

  async function onSubmit() {
    if (!name.trim()) {
      toast.error("Allowance name is required");
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

    if (taxable && (!taxPercentage || Number(taxPercentage) <= 0)) {
      toast.error("Tax percentage is required for taxable allowances");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        type,
        taxable,
        description: description.trim(),
      };

      if (calculationType === "percentage") {
        payload.percentage = Number(percentage);
        payload.amount = undefined;
      } else {
        payload.amount = Number(amount);
        payload.percentage = undefined;
      }

      if (taxable) {
        payload.taxPercentage = Number(taxPercentage);
      }

      let result: {
        error: { reason: string } | null;
        success: { reason: string } | null;
      };

      if (initial?.id) {
        result = await updateAllowance(
          initial.id,
          payload,
          window.location.pathname,
        );
      } else {
        result = await createAllowance(payload, window.location.pathname);
      }

      if (result.error) {
        toast.error(result.error.reason);
      } else if (result.success) {
        toast.success(result.success.reason);
        handleOpenChange(false);
        onCompleteAction?.();
      }
    } catch (_error) {
      toast.error("Failed to save allowance");
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
            {initial?.id ? "Edit Allowance" : "New Allowance"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Allowance Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Housing Allowance"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as AllowanceType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one-time">One-time</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="bi-annual">Bi-Annual</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
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
                placeholder="e.g., 50000.00"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              id="taxable"
              checked={taxable}
              onCheckedChange={setTaxable}
            />
            <Label htmlFor="taxable">Taxable</Label>
          </div>

          {taxable && (
            <div className="grid gap-2">
              <Label htmlFor="taxPercentage">Tax Percentage *</Label>
              <Input
                id="taxPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(e.target.value)}
                placeholder="e.g., 7.50"
              />
              <p className="text-xs text-muted-foreground">
                Enter tax percentage (0-100) for this allowance
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter allowance description"
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
                : "Create allowance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
