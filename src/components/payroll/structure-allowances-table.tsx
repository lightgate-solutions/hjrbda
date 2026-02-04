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
  addAllowanceToStructure,
  getStructureAllowances,
  removeAllowanceFromStructure,
} from "@/actions/payroll/salary-allowances";
import { getAllAllowancesMonthly } from "@/actions/payroll/allowances";
import { DateTimePicker } from "@/components/ui/date-time";
import { Label } from "../ui/label";

const typeLabels: Record<string, string> = {
  "one-time": "One-time",
  monthly: "Monthly",
  annual: "Annual",
  "bi-annaul": "bi-annual",
  quarterly: "quarterly",
  custom: "custom",
};

interface StructureAllowancesTableProps {
  structureId: number;
  baseSalary: string | number;
  isStructureActive: boolean;
}

export function StructureAllowancesTable({
  structureId,
  baseSalary,
  isStructureActive,
}: StructureAllowancesTableProps) {
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedAllowance, setSelectedAllowance] = useState<any | null>(null);
  const [selectedAllowanceId, setSelectedAllowanceId] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(
    new Date(),
  );
  const baseSalaryAmount =
    typeof baseSalary === "string" ? parseFloat(baseSalary) : baseSalary;

  const queryClient = useQueryClient();

  const {
    data: structureAllowances = [],
    isLoading: isLoadingStructureAllowances,
    isError: isErrorStructureAllowances,
    error: structureAllowancesError,
  } = useQuery({
    queryKey: ["structureAllowances", structureId],
    queryFn: () => getStructureAllowances(structureId),
  });

  const { data: allAllowances = [], isLoading: isLoadingAllowances } = useQuery(
    {
      queryKey: ["allowances"],
      queryFn: () => getAllAllowancesMonthly(),
    },
  );

  const availableAllowances = allAllowances.filter((allowance) => {
    return !structureAllowances.some((sa) => sa.allowanceId === allowance.id);
  });

  const addAllowanceMutation = useMutation({
    mutationFn: async (allowanceId: number) => {
      return await addAllowanceToStructure(
        {
          salaryStructureId: structureId,
          allowanceId: allowanceId,
          effectiveFrom: effectiveDate,
        },
        window.location.pathname,
      );
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        queryClient.invalidateQueries({
          queryKey: ["structureAllowances", structureId],
        });
        setIsAddDialogOpen(false);
        setSelectedAllowanceId("");
        setEffectiveDate(new Date());
      } else if (result.error) {
        toast.error(result.error.reason);
      }
    },
    onError: () => {
      toast.error("Failed to add allowance to structure");
    },
  });

  const removeAllowanceMutation = useMutation({
    mutationFn: async (salaryAllowanceId: number) => {
      return await removeAllowanceFromStructure(
        salaryAllowanceId,
        window.location.pathname,
      );
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        queryClient.invalidateQueries({
          queryKey: ["structureAllowances", structureId],
        });
      } else if (result.error) {
        toast.error(result.error.reason);
      }
      setIsRemoveDialogOpen(false);
      setSelectedAllowance(null);
    },
    onError: () => {
      toast.error("Failed to remove allowance from structure");
      setIsRemoveDialogOpen(false);
      setSelectedAllowance(null);
    },
  });

  const handleAddAllowance = () => {
    if (!selectedAllowanceId) {
      toast.error("Please select an allowance to add");
      return;
    }

    const allowanceId = parseInt(selectedAllowanceId, 10);
    addAllowanceMutation.mutate(allowanceId);
  };

  const handleRemoveAllowance = () => {
    if (!selectedAllowance) return;
    removeAllowanceMutation.mutate(selectedAllowance.id);
  };

  const calculateAllowanceAmount = (allowance: any): number => {
    if (allowance.percentage) {
      return (baseSalaryAmount * parseFloat(allowance.percentage)) / 100;
    }
    return Number(allowance.amount || 0);
  };

  const calculateTaxAmount = (allowance: any): number => {
    if (!allowance.taxable || !allowance.taxPercentage) return 0;

    let allowanceAmount = 0;
    if (allowance.percentage) {
      allowanceAmount =
        (baseSalaryAmount * parseFloat(allowance.percentage)) / 100;
    } else if (allowance.amount) {
      allowanceAmount = parseFloat(allowance.amount);
    }

    return (allowanceAmount * parseFloat(allowance.taxPercentage)) / 100;
  };

  const calculateNetAllowance = (allowance: any): number => {
    const allowanceAmount = calculateAllowanceAmount(allowance);
    const taxAmount = calculateTaxAmount(allowance);
    return allowanceAmount - taxAmount;
  };

  if (isErrorStructureAllowances) {
    toast.error(structureAllowancesError.message);
    return (
      <div className="text-destructive">Error loading structure allowances</div>
    );
  }

  if (isLoadingStructureAllowances) {
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
              <Button>+ Add Allowance</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Allowance to Structure</DialogTitle>
                <DialogDescription>
                  Select an allowance to add to this salary structure and choose
                  when it should take effect.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-6">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Allowance
                  </Label>
                  <Select
                    value={selectedAllowanceId}
                    onValueChange={setSelectedAllowanceId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an allowance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Available Allowances</SelectLabel>
                        {isLoadingAllowances ? (
                          <SelectItem value="loading" disabled>
                            Loading...
                          </SelectItem>
                        ) : availableAllowances.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No available allowances
                          </SelectItem>
                        ) : (
                          availableAllowances.map((allowance) => (
                            <SelectItem
                              key={allowance.id}
                              value={allowance.id.toString()}
                            >
                              {allowance.name}{" "}
                              {allowance.percentage
                                ? `(${allowance.percentage}%)`
                                : `(${formatCurrency(Number(allowance.amount || 0))})`}
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
                    setSelectedAllowanceId("");
                    setEffectiveDate(new Date()); // Reset date
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddAllowance}
                  disabled={addAllowanceMutation.isPending}
                >
                  {addAllowanceMutation.isPending
                    ? "Adding..."
                    : "Add Allowance"}
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
                <TableHead>Tax Amount</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Effective From</TableHead>
                {isStructureActive && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {structureAllowances.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isStructureActive ? 7 : 6}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No allowances added to this structure.
                  </TableCell>
                </TableRow>
              ) : (
                structureAllowances.map((allowance) => (
                  <TableRow key={allowance.id}>
                    <TableCell className="font-medium text-xs">
                      {allowance.allowanceName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeLabels[allowance.allowanceType] ||
                          allowance.allowanceType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {allowance.percentage
                        ? `${allowance.percentage}% (${formatCurrency(calculateAllowanceAmount(allowance))})`
                        : formatCurrency(calculateAllowanceAmount(allowance))}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        variant={allowance.taxable ? "secondary" : "outline"}
                      >
                        {allowance.taxable
                          ? `${allowance.taxPercentage}% (${formatCurrency(calculateTaxAmount(allowance))})`
                          : "Non-taxable"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatCurrency(calculateNetAllowance(allowance))}
                    </TableCell>
                    <TableCell className="text-xs">
                      {allowance.effectiveFrom
                        ? new Date(allowance.effectiveFrom).toLocaleDateString()
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
                                setSelectedAllowance(allowance);
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
            <AlertDialogTitle>Remove Allowance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this allowance from the salary
              structure? This will not delete the allowance itself, but will
              remove it from this structure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAllowance}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeAllowanceMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
