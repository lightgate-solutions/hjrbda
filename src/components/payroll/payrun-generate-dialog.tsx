"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generatePayrun, getAllAllowances } from "@/actions/payroll/payrun";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PayrunGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayrunGenerateDialog({
  open,
  onOpenChange,
}: PayrunGenerateDialogProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const currentDate = new Date();

  const [isSalaryPayrun, setIsSalaryPayrun] = useState(true);
  const [selectedAllowanceId, setSelectedAllowanceId] = useState<string>("");
  const [month, setMonth] = useState<string>(
    String(currentDate.getMonth() + 1),
  );
  const [year, setYear] = useState<string>(String(currentDate.getFullYear()));

  const { data: allowances } = useQuery({
    queryKey: ["all-allowances"],
    queryFn: getAllAllowances,
    enabled: !isSalaryPayrun,
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      generatePayrun(
        {
          type: isSalaryPayrun ? "salary" : "allowance",
          allowanceId: !isSalaryPayrun
            ? Number(selectedAllowanceId)
            : undefined,
          month: Number(month),
          year: Number(year),
        },
        pathname,
      ),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        queryClient.invalidateQueries({ queryKey: ["payruns"] });
        onOpenChange(false);
        resetForm();
      } else if (result.error) {
        toast.error(result.error.reason);
      }
    },
    onError: () => {
      toast.error("Failed to generate payrun");
    },
  });

  const resetForm = () => {
    setIsSalaryPayrun(true);
    setSelectedAllowanceId("");
    setMonth(String(currentDate.getMonth() + 1));
    setYear(String(currentDate.getFullYear()));
  };

  const handleGenerate = () => {
    if (!isSalaryPayrun && !selectedAllowanceId) {
      toast.error("Please select an allowance");
      return;
    }
    generateMutation.mutate();
  };

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => {
    const y = currentDate.getFullYear() - 2 + i;
    return { value: String(y), label: String(y) };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Payrun</DialogTitle>
          <DialogDescription>
            Create a new payrun for salary or specific allowance disbursement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="salary-payrun">Salary Payrun</Label>
              <p className="text-sm text-muted-foreground">
                Include base salary, all allowances, and deductions
              </p>
            </div>
            <Switch
              id="salary-payrun"
              checked={isSalaryPayrun}
              onCheckedChange={setIsSalaryPayrun}
            />
          </div>

          {!isSalaryPayrun && (
            <div className="space-y-2">
              <Label htmlFor="allowance">Select Allowance</Label>
              <Select
                value={selectedAllowanceId}
                onValueChange={setSelectedAllowanceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select allowance" />
                </SelectTrigger>
                <SelectContent>
                  {allowances?.map((allowance) => (
                    <SelectItem key={allowance.id} value={String(allowance.id)}>
                      {allowance.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Only employees with this allowance will be included
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.value} value={y.value}>
                      {y.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Payrun"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
