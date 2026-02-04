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
  getActiveEmployeeAllowances,
  getAvailableAllowancesForEmployee,
  addAllowanceToEmployee,
  removeAllowanceFromEmployee,
} from "@/actions/payroll/employee-allowances";
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

type AllowanceType =
  | "one-time"
  | "monthly"
  | "annual"
  | "bi-annual"
  | "quarterly"
  | "custom";

type EmployeeAllowance = {
  id: number;
  employeeId: number;
  allowanceId: number;
  effectiveFrom: Date | null;
  allowanceName: string;
  allowanceType: AllowanceType;
  amount: string | null;
  percentage: string | null;
  taxable: boolean;
  taxPercentage: string | null;
  description: string | null;
};

type AvailableAllowance = {
  id: number;
  name: string;
  type: AllowanceType;
  percentage: string | null;
  amount: string | null;
  taxable: boolean;
  taxPercentage: string | null;
  description: string | null;
};

type EmployeeAllowanceDialogProps = {
  trigger?: React.ReactNode;
  employeeId: number;
  employeeName: string;
  isOpen?: boolean;
  onOpenChangeAction?: (open: boolean) => void;
};

export function EmployeeAllowanceDialog({
  trigger,
  employeeId,
  employeeName,
  isOpen,
  onOpenChangeAction,
}: EmployeeAllowanceDialogProps) {
  const [open, setOpen] = useState(isOpen || false);
  const [loading, setLoading] = useState(false);
  const [allowances, setAllowances] = useState<EmployeeAllowance[]>([]);
  const [availableAllowances, setAvailableAllowances] = useState<
    AvailableAllowance[]
  >([]);
  const [selectedAllowanceId, setSelectedAllowanceId] = useState<string>("");
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
      const [activeAllowances, available] = await Promise.all([
        getActiveEmployeeAllowances(employeeId),
        getAvailableAllowancesForEmployee(employeeId),
      ]);

      setAllowances(activeAllowances);
      setAvailableAllowances(available);
    } catch (_error) {
      toast.error("Failed to load allowances");
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

  const handleAssignAllowance = async () => {
    if (!selectedAllowanceId) {
      toast.error("Please select an allowance");
      return;
    }

    setLoadingAssign(true);
    try {
      const result = await addAllowanceToEmployee(
        employeeId,
        Number(selectedAllowanceId),
        date,
        window.location.pathname,
      );

      if (result.error) {
        toast.error(result.error.reason);
      } else if (result.success) {
        toast.success(result.success.reason);
        setAddDialogOpen(false);
        setSelectedAllowanceId("");
        loadData();
      }
    } catch (_error) {
      toast.error("Failed to assign allowance");
    } finally {
      setLoadingAssign(false);
    }
  };

  const handleRemoveAllowance = async (employeeAllowanceId: number) => {
    try {
      const result = await removeAllowanceFromEmployee(
        employeeAllowanceId,
        window.location.pathname,
      );

      if (result.error) {
        toast.error(result.error.reason);
      } else if (result.success) {
        toast.success(result.success.reason);
        loadData();
      }
    } catch (_error) {
      toast.error("Failed to remove allowance");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="max-h-11/12 overflow-auto min-w-[700px]">
          <DialogHeader>
            <DialogTitle>Employee Allowances</DialogTitle>
            <DialogDescription>
              Manage allowances for {employeeName}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="mb-4"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Allowance
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableCaption>
                {allowances.length === 0
                  ? "No allowances assigned to this employee"
                  : "All active allowances for this employee"}
              </TableCaption>
              {allowances.length > 0 && (
                <>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Allowance</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead>Taxable</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allowances.map((allowance) => (
                      <TableRow key={allowance.id}>
                        <TableCell className="font-medium">
                          {allowance.allowanceName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {allowance.allowanceType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {allowance.amount
                            ? `₦${parseFloat(allowance.amount).toLocaleString()}`
                            : allowance.percentage
                              ? `${parseFloat(allowance.percentage)}%`
                              : "-"}
                        </TableCell>
                        <TableCell>
                          {allowance.effectiveFrom
                            ? format(
                                new Date(allowance.effectiveFrom),
                                "dd MMM yyyy",
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={allowance.taxable ? "default" : "outline"}
                          >
                            {allowance.taxable ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveAllowance(allowance.id)}
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

      {/* Dialog for Adding New Allowance */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Allowance</DialogTitle>
            <DialogDescription>
              Assign a new allowance to {employeeName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="allowance">Select Allowance</Label>
              <Select
                value={selectedAllowanceId}
                onValueChange={setSelectedAllowanceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an allowance" />
                </SelectTrigger>
                <SelectContent>
                  {availableAllowances.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No allowances available
                    </SelectItem>
                  ) : (
                    availableAllowances.map((allowance) => (
                      <SelectItem
                        key={allowance.id}
                        value={allowance.id.toString()}
                      >
                        {allowance.name} (
                        {allowance.amount
                          ? `₦${parseFloat(allowance.amount).toLocaleString()}`
                          : `${parseFloat(allowance.percentage || "0")}%`}
                        )
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

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
              onClick={handleAssignAllowance}
              disabled={loadingAssign || !selectedAllowanceId}
            >
              {loadingAssign && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Assign Allowance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
