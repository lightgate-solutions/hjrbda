/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import {
  addDeductionToStructure,
  getStructureDeductions,
  removeDeductionFromStructure,
} from "@/actions/payroll/salary-deductions";
import { getAllRecurringDeductions } from "@/actions/payroll/deductions";
import { DateTimePicker } from "@/components/ui/date-time";
import { Label } from "../ui/label";

const typeLabels: Record<string, string> = {
  "one-time": "One-time",
  recurring: "Recurring",
  statutory: "Statutory",
  loan: "Loan",
  advance: "Advance",
};

interface StructureDeductionsTableProps {
  structureId: number;
  baseSalary: string | number;
  isStructureActive: boolean;
}

export function StructureDeductionsTable({
  structureId,
  baseSalary,
  isStructureActive,
}: StructureDeductionsTableProps) {
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDeduction, setSelectedDeduction] = useState<any | null>(null);
  const [selectedDeductionId, setSelectedDeductionId] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(
    new Date(),
  );
  const baseSalaryAmount =
    typeof baseSalary === "string" ? parseFloat(baseSalary) : baseSalary;

  const queryClient = useQueryClient();

  const {
    data: structureDeductions = [],
    isLoading: isLoadingStructureDeductions,
    isError: isErrorStructureDeductions,
    error: structureDeductionsError,
  } = useQuery({
    queryKey: ["structureDeductions", structureId],
    queryFn: () => getStructureDeductions(structureId),
  });

  const { data: allDeductions = [], isLoading: isLoadingDeductions } = useQuery(
    {
      queryKey: ["deductions"],
      queryFn: () => getAllRecurringDeductions(),
    },
  );

  const availableDeductions = allDeductions.filter((deduction) => {
    return !structureDeductions.some((sd) => sd.deductionId === deduction.id);
  });

  const addDeductionMutation = useMutation({
    mutationFn: async (deductionId: number) => {
      return await addDeductionToStructure(
        {
          salaryStructureId: structureId,
          deductionId: deductionId,
          effectiveFrom: effectiveDate,
        },
        window.location.pathname,
      );
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        queryClient.invalidateQueries({
          queryKey: ["structureDeductions", structureId],
        });
        setIsAddDialogOpen(false);
        setSelectedDeductionId("");
        setEffectiveDate(new Date()); // Reset to current date
      } else if (result.error) {
        toast.error(result.error.reason);
      }
    },
    onError: () => {
      toast.error("Failed to add deduction to structure");
    },
  });

  const removeDeductionMutation = useMutation({
    mutationFn: async (salaryDeductionId: number) => {
      return await removeDeductionFromStructure(
        salaryDeductionId,
        window.location.pathname,
      );
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        queryClient.invalidateQueries({
          queryKey: ["structureDeductions", structureId],
        });
      } else if (result.error) {
        toast.error(result.error.reason);
      }
      setIsRemoveDialogOpen(false);
      setSelectedDeduction(null);
    },
    onError: () => {
      toast.error("Failed to remove deduction from structure");
      setIsRemoveDialogOpen(false);
      setSelectedDeduction(null);
    },
  });

  const handleAddDeduction = () => {
    if (!selectedDeductionId) {
      toast.error("Please select a deduction to add");
      return;
    }

    const deductionId = parseInt(selectedDeductionId, 10);
    addDeductionMutation.mutate(deductionId);
  };

  const handleRemoveDeduction = () => {
    if (!selectedDeduction) return;
    removeDeductionMutation.mutate(selectedDeduction.id);
  };

  const calculateDeductionAmount = (deduction: any) => {
    if (deduction.percentage) {
      const amount =
        (baseSalaryAmount * parseFloat(deduction.percentage)) / 100;
      return formatCurrency(amount);
    }
    return formatCurrency(Number(deduction.amount || 0));
  };

  if (isErrorStructureDeductions) {
    toast.error(structureDeductionsError.message);
    return (
      <div className="text-destructive">Error loading structure deductions</div>
    );
  }

  if (isLoadingStructureDeductions) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/3 rounded bg-muted animate-pulse"></div>
        <div className="h-64 rounded bg-muted animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isStructureActive && (
        <div className="flex justify-end">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>+ Add Deduction</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Deduction to Structure</DialogTitle>
                <DialogDescription>
                  Select a deduction to add to this salary structure and choose
                  when it should take effect.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-6">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Deduction
                  </Label>
                  <Select
                    value={selectedDeductionId}
                    onValueChange={setSelectedDeductionId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a deduction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Available Deductions</SelectLabel>
                        {isLoadingDeductions ? (
                          <SelectItem value="loading" disabled>
                            Loading...
                          </SelectItem>
                        ) : availableDeductions.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No available deductions
                          </SelectItem>
                        ) : (
                          availableDeductions.map((deduction) => (
                            <SelectItem
                              key={deduction.id}
                              value={deduction.id.toString()}
                            >
                              {deduction.name}{" "}
                              {deduction.percentage
                                ? `(${deduction.percentage}%)`
                                : `(${formatCurrency(Number(deduction.amount || 0))})`}
                            </SelectItem>
                          ))
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Effective From
                  </Label>
                  <DateTimePicker
                    date={effectiveDate}
                    setDate={setEffectiveDate}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setSelectedDeductionId("");
                    setEffectiveDate(new Date()); // Reset date
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddDeduction}
                  disabled={addDeductionMutation.isPending}
                >
                  {addDeductionMutation.isPending
                    ? "Adding..."
                    : "Add Deduction"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Card className="shadow-sm rounded-none p-1">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Effective From</TableHead>
                {isStructureActive && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {structureDeductions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isStructureActive ? 5 : 4}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No deductions added to this structure.
                  </TableCell>
                </TableRow>
              ) : (
                structureDeductions.map((deduction) => (
                  <TableRow key={deduction.id}>
                    <TableCell className="font-medium text-xs">
                      {deduction.deductionName}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline">
                        {typeLabels[deduction.deductionType] ||
                          deduction.deductionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {deduction.percentage
                        ? `${deduction.percentage}% (${calculateDeductionAmount(deduction)})`
                        : formatCurrency(Number(deduction.amount || 0))}
                    </TableCell>
                    <TableCell className="text-xs">
                      {deduction.effectiveFrom
                        ? new Date(deduction.effectiveFrom).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    {isStructureActive && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedDeduction(deduction);
                                setIsRemoveDialogOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={isRemoveDialogOpen}
        onOpenChange={setIsRemoveDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Deduction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this deduction from the salary
              structure? This will not delete the deduction itself, but will
              remove it from this structure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveDeduction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeDeductionMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
