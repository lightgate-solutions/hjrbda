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
import {
  createSalaryStructure,
  updateSalaryStructure,
} from "@/actions/payroll/salary-structure";

type Props = {
  trigger?: React.ReactNode;
  initial?: {
    id: number;
    name: string;
    baseSalary: string;
    description: string | null;
  } | null;
  isOpen?: boolean;
  onOpenChangeAction?: (open: boolean) => void;
  onCompleteAction?: () => void;
};

export function SalaryStructureFormDialog({
  trigger,
  initial,
  isOpen,
  onOpenChangeAction,
  onCompleteAction,
}: Props) {
  const [open, setOpen] = useState(isOpen || false);
  const [name, setName] = useState(initial?.name ?? "");
  const [baseSalary, setBaseSalary] = useState(initial?.baseSalary ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);

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
    setBaseSalary(initial?.baseSalary ?? "");
    setDescription(initial?.description ?? "");
  }, [initial, open]);

  async function onSubmit() {
    if (!name.trim()) {
      toast.error("Salary Structure name is required");
      return;
    }
    if (!baseSalary || Number(baseSalary) <= 0) {
      toast.error("Base salary must be greater than 0");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        baseSalary: Number(baseSalary),
        description: description.trim(),
      };

      let result: {
        error: { reason: string } | null;
        success: { reason: string } | null;
      };
      if (initial?.id) {
        result = await updateSalaryStructure(
          initial.id,
          payload,
          window.location.pathname,
        );
      } else {
        result = await createSalaryStructure(payload, window.location.pathname);
      }

      if (result.error) {
        toast.error(result.error.reason);
      } else if (result.success) {
        toast.success(result.success.reason);
        handleOpenChange(false);
        onCompleteAction?.();
      }
    } catch (_error) {
      toast.error("Failed to save salary structure");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial?.id ? "Edit Salary Structure" : "New Salary Structure"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Salary Structure Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Level 8 Staff"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="baseSalary">Base Salary (NGN) *</Label>
            <Input
              id="baseSalary"
              type="number"
              step="0.01"
              min="0"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter salary structure description"
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
                : "Create structure"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
