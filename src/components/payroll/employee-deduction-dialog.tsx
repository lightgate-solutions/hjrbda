/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  getActiveEmployeeDeductions,
  getDeductionTypes,
  addDeductionToEmployee,
  deactivateEmployeeDeduction,
} from "@/actions/payroll/employee-deductions";
import { CalendarIcon, Loader2, Plus, Trash } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { getEmployeeSalaryHistory } from "@/actions/payroll/employee-salary";

type DeductionType =
  | "recurring"
  | "one-time"
  | "statutory"
  | "loan"
  | "advance";

type EmployeeDeduction = {
  id: number;
  employeeId: number;
  name: string;
  salaryStructureId: number;
  structureName: string | null;
  amount: string | null;
  percentage: string | null;
  originalAmount: string | null;
  remainingAmount: string | null;
  active: boolean;
  effectiveFrom: Date | null;
};

type DeductionTemplate = {
  id: number;
  name: string;
  type: DeductionType;
  amount: string | null;
  percentage: string | null;
};

type SalaryStructure = {
  id: number;
  salaryStructureId: number;
  structureName: string | null;
  baseSalary: string | null;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
};

type EmployeeDeductionDialogProps = {
  trigger?: React.ReactNode;
  employeeId: number;
  employeeName: string;
  isOpen?: boolean;
  onOpenChangeAction?: (open: boolean) => void;
};

export function EmployeeDeductionDialog({
  trigger,
  employeeId,
  employeeName,
  isOpen,
  onOpenChangeAction,
}: EmployeeDeductionDialogProps) {
  const [open, setOpen] = useState(isOpen || false);
  const [loading, setLoading] = useState(false);
  const [deductions, setDeductions] = useState<EmployeeDeduction[]>([]);
  const [deductionTemplates, setDeductionTemplates] = useState<
    DeductionTemplate[]
  >([]);
  const [_salaryHistory, setSalaryHistory] = useState<SalaryStructure[]>([]);
  const [activeSalaryStructure, setActiveSalaryStructure] =
    useState<SalaryStructure | null>(null);
  const [selectedDeductionId, setSelectedDeductionId] = useState<string>("");
  const [deductionName, setDeductionName] = useState("");
  const [deductionAmount, setDeductionAmount] = useState("");
  const [deductionPercentage, setDeductionPercentage] = useState("");
  const [calculationType, setCalculationType] = useState<
    "fixed" | "percentage"
  >("fixed");
  const [date, setDate] = useState<Date>(new Date());
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChangeAction?.(newOpen);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [activeDeductions, templates, salary] = await Promise.all([
        getActiveEmployeeDeductions(employeeId),
        getDeductionTypes(),
        getEmployeeSalaryHistory(employeeId),
      ]);

      setDeductions(activeDeductions);
      setDeductionTemplates(templates);
      setSalaryHistory(salary);

      // Find active salary structure
      const active = salary.find((s) => s.effectiveTo === null);
      setActiveSalaryStructure(active || null);
    } catch (_error) {
      toast.error("Failed to load deductions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof isOpen !== "undefined") {
      setOpen(isOpen);
    }
  }, [isOpen]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, employeeId]);

  useEffect(() => {
    if (selectedDeductionId) {
      const template = deductionTemplates.find(
        (d) => d.id.toString() === selectedDeductionId,
      );
      if (template) {
        setDeductionName(template.name);
        if (template.amount) {
          setCalculationType("fixed");
          setDeductionAmount(template.amount);
          setDeductionPercentage("");
        } else if (template.percentage) {
          setCalculationType("percentage");
          setDeductionPercentage(template.percentage);
          setDeductionAmount("");
        }
      }
    } else {
      setDeductionName("");
      setDeductionAmount("");
      setDeductionPercentage("");
    }
  }, [selectedDeductionId, deductionTemplates]);

  const handleAddDeduction = async () => {
    if (!activeSalaryStructure) {
      toast.error("Employee does not have an active salary structure");
      return;
    }

    if (!deductionName.trim()) {
      toast.error("Deduction name is required");
      return;
    }

    if (
      calculationType === "fixed" &&
      (!deductionAmount || parseFloat(deductionAmount) <= 0)
    ) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (
      calculationType === "percentage" &&
      (!deductionPercentage || parseFloat(deductionPercentage) <= 0)
    ) {
      toast.error("Percentage must be greater than 0");
      return;
    }

    setLoadingAssign(true);
    try {
      const result = await addDeductionToEmployee(
        {
          employeeId,
          salaryStructureId: activeSalaryStructure.salaryStructureId,
          name: deductionName,
          amount:
            calculationType === "fixed"
              ? parseFloat(deductionAmount)
              : undefined,
          percentage:
            calculationType === "percentage"
              ? parseFloat(deductionPercentage)
              : undefined,
          effectiveFrom: date,
        },
        window.location.pathname,
      );

      if (result.error) {
        toast.error(result.error.reason);
      } else if (result.success) {
        toast.success(result.success.reason);
        setAddDialogOpen(false);
        setSelectedDeductionId("");
        setDeductionName("");
        setDeductionAmount("");
        setDeductionPercentage("");
        loadData();
      }
    } catch (_error) {
      toast.error("Failed to add deduction");
    } finally {
      setLoadingAssign(false);
    }
  };

  const handleRemoveDeduction = async (deductionId: number) => {
    try {
      const result = await deactivateEmployeeDeduction(
        deductionId,
        window.location.pathname,
      );

      if (result.error) {
        toast.error(result.error.reason);
      } else if (result.success) {
        toast.success(result.success.reason);
        loadData();
      }
    } catch (_error) {
      toast.error("Failed to remove deduction");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="max-h-11/12 overflow-auto min-w-[700px]">
          <DialogHeader>
            <DialogTitle>Employee Deductions</DialogTitle>
            <DialogDescription>
              Manage deductions for {employeeName}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-between items-center mb-4">
            <div>
              {activeSalaryStructure ? (
                <Badge variant="outline" className="px-2 py-1">
                  Current Structure: {activeSalaryStructure.structureName}
                  {activeSalaryStructure.baseSalary
                    ? ` (₦${parseFloat(activeSalaryStructure.baseSalary).toLocaleString()})`
                    : ""}
                </Badge>
              ) : (
                <Badge variant="destructive" className="px-2 py-1">
                  No Active Salary Structure
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddDialogOpen(true)}
              disabled={!activeSalaryStructure}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Deduction
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableCaption>
                {deductions.length === 0
                  ? "No active deductions for this employee"
                  : "All active deductions for this employee"}
              </TableCaption>
              {deductions.length > 0 && (
                <>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deduction</TableHead>
                      <TableHead>Salary Structure</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deductions.map((deduction) => (
                      <TableRow key={deduction.id}>
                        <TableCell className="font-medium">
                          {deduction.name}
                        </TableCell>
                        <TableCell>
                          {deduction.structureName || "N/A"}
                        </TableCell>
                        <TableCell>
                          {deduction.amount
                            ? `₦${parseFloat(deduction.amount).toLocaleString()}`
                            : deduction.percentage
                              ? `${parseFloat(deduction.percentage)}%`
                              : "-"}
                        </TableCell>
                        <TableCell>
                          {deduction.effectiveFrom
                            ? format(
                                new Date(deduction.effectiveFrom),
                                "dd MMM yyyy",
                              )
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveDeduction(deduction.id)}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </>
              )}
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog for Adding New Deduction */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Deduction</DialogTitle>
            <DialogDescription>
              Assign a new deduction to {employeeName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deductionTemplate">
                Deduction Template (Optional)
              </Label>
              <Select
                value={selectedDeductionId}
                onValueChange={setSelectedDeductionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template or create custom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Deduction</SelectItem>
                  {deductionTemplates.map((template) => (
                    <SelectItem
                      key={template.id}
                      value={template.id.toString()}
                    >
                      {template.name} (
                      {template.amount
                        ? `₦${parseFloat(template.amount).toLocaleString()}`
                        : `${parseFloat(template.percentage || "0")}%`}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deductionName">Deduction Name *</Label>
              <Input
                id="deductionName"
                value={deductionName}
                onChange={(e) => setDeductionName(e.target.value)}
                placeholder="Enter deduction name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Calculation Method *</Label>
              <Select
                value={calculationType}
                onValueChange={(v) =>
                  setCalculationType(v as "fixed" | "percentage")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select calculation method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">
                    Percentage of Base Salary
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {calculationType === "fixed" ? (
              <div className="space-y-2">
                <Label htmlFor="amount">Fixed Amount (₦) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value)}
                  placeholder="e.g., 5000.00"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="percentage">Percentage of Base Salary *</Label>
                <Input
                  id="percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={deductionPercentage}
                  onChange={(e) => setDeductionPercentage(e.target.value)}
                  placeholder="e.g., 10.00"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter percentage (0-100) of base salary
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Effective From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddDeduction}
              disabled={
                loadingAssign ||
                !deductionName.trim() ||
                (calculationType === "fixed" &&
                  (!deductionAmount || parseFloat(deductionAmount) <= 0)) ||
                (calculationType === "percentage" &&
                  (!deductionPercentage ||
                    parseFloat(deductionPercentage) <= 0))
              }
            >
              {loadingAssign && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Deduction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
