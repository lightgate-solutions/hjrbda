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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Props = {
  trigger: React.ReactNode;
  initial?: {
    id: number;
    title: string;
    description: string | null;
    amount: string;
    category: string | null;
    expenseDate: string;
  } | null;
  onCompleted?: () => void;
};

const expenseCategories = [
  "Office Supplies",
  "Utilities",
  "Rent",
  "Salaries",
  "Marketing",
  "Travel",
  "Equipment",
  "Maintenance",
  "Insurance",
  "Legal",
  "Other",
];

export function ExpenseFormDialog({ trigger, initial, onCompleted }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [expenseDate, setExpenseDate] = useState(
    initial?.expenseDate
      ? new Date(initial.expenseDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setAmount(initial?.amount ?? "");
    setCategory(initial?.category ?? "");
    setExpenseDate(
      initial?.expenseDate
        ? new Date(initial.expenseDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    );
  }, [initial, open]);

  async function onSubmit() {
    if (!title.trim()) {
      alert("Title is required");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description || null,
        amount: Number(amount),
        category: category || null,
        expenseDate: expenseDate ? new Date(expenseDate).toISOString() : null,
      };

      if (initial?.id) {
        await fetch(`/api/finance/expenses/${initial.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/finance/expenses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setOpen(false);
      onCompleted?.();
      // Notify balance card to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("expenses:changed"));
      }
    } catch (_error) {
      toast.error("Error saving expense:");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial?.id ? "Edit Expense" : "New Expense"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter expense title"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter expense description"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category || undefined}
              onValueChange={(v) => setCategory(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {category && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCategory("")}
                className="h-6 w-fit text-xs"
              >
                Clear category
              </Button>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expenseDate">Expense Date *</Label>
            <Input
              id="expenseDate"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={saving}>
            {initial?.id ? "Save changes" : "Create expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
