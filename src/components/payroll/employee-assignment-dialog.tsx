/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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
  getEmployeesNotInStructure,
  assignEmployeeToStructure,
} from "@/actions/payroll/employee-salary";
import { formatCurrency } from "@/lib/utils";

type EmployeeOption = {
  id: number;
  name: string;
  staffNumber: string | null;
  department: string | null;
  currentStructureId: number | null;
  currentStructureName: string | null;
};

type Props = {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChangeAction?: (open: boolean) => void;
  onCompleteAction?: () => void;
  structureId: number;
  structureName: string;
  baseSalary: string;
};

export function EmployeeAssignmentDialog({
  trigger,
  isOpen,
  onOpenChangeAction,
  onCompleteAction,
  structureId,
  structureName,
  baseSalary,
}: Props) {
  const [open, setOpen] = useState(isOpen || false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeOption | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // Handle controlled state from parent
  useEffect(() => {
    if (typeof isOpen !== "undefined") {
      setOpen(isOpen);
    }
  }, [isOpen]);

  useEffect(() => {
    if (open) {
      loadEmployees();
    } else {
      setSelectedEmployeeId("");
      setSelectedEmployee(null);
      setEffectiveDate(new Date().toISOString().split("T")[0]);
    }
  }, [open, structureId]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const employeesList = await getEmployeesNotInStructure(structureId);
      setEmployees(employeesList);

      if (employeesList.length === 0) {
        setTimeout(() => {
          toast.info(
            "No available employees found. This could be because all employees are already assigned to this structure, or no employees exist in the database.",
          );
        }, 500);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load employees",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const employee =
      employees.find((e) => e.id.toString() === employeeId) || null;
    setSelectedEmployee(employee);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (onOpenChangeAction) {
      onOpenChangeAction(newOpen);
    }
  };

  const handleAssignClick = () => {
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    if (selectedEmployee.currentStructureId) {
      setShowWarning(true);
    } else {
      assignEmployee();
    }
  };

  const assignEmployee = async () => {
    if (!selectedEmployee || !effectiveDate) {
      toast.error("Please select an employee and effective date");
      return;
    }

    setSaving(true);
    try {
      const result = await assignEmployeeToStructure(
        {
          employeeId: selectedEmployee.id,
          salaryStructureId: structureId,
          effectiveFrom: new Date(effectiveDate),
        },
        window.location.pathname,
      );

      if (result.error) {
        toast.error(result.error.reason);
      } else if (result.success) {
        toast.success(result.success.reason);
        handleOpenChange(false);
        if (onCompleteAction) {
          onCompleteAction();
        }
      }
    } catch (_error) {
      toast.error("Failed to assign employee");
    } finally {
      setSaving(false);
      setShowWarning(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Employee to Salary Structure</DialogTitle>
            <DialogDescription>
              Assign an employee to the {structureName} structure with a base
              salary of {formatCurrency(Number(baseSalary))}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="employee">Select Employee *</Label>
                {!loading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadEmployees}
                    className="h-6 px-2 text-xs"
                  >
                    Refresh List
                  </Button>
                )}
              </div>
              {loading ? (
                <div className="h-10 bg-muted w-1/2 animate-pulse rounded"></div>
              ) : (
                <Select
                  value={selectedEmployeeId}
                  onValueChange={handleEmployeeChange}
                >
                  <SelectTrigger id="employee">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 ? (
                      <div className="py-4 text-center text-sm space-y-2">
                        <div className="text-amber-500 font-medium">
                          No employees available
                        </div>
                      </div>
                    ) : (
                      employees.map((employee) => (
                        <SelectItem
                          key={employee.id}
                          value={employee.id.toString()}
                        >
                          <div className="flex flex-col">
                            <span>{employee.name}</span>
                            {employee.currentStructureName && (
                              <span className="text-xs text-amber-500">
                                Currently in: {employee.currentStructureName}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="effectiveDate">Effective From *</Label>
              <Input
                type="date"
                id="effectiveDate"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>

            {selectedEmployee?.currentStructureName && (
              <div className="rounded-md bg-amber-50 p-3 text-amber-800 text-sm">
                <p>
                  <strong>Note:</strong> This employee is currently assigned to
                  the <strong>{selectedEmployee.currentStructureName}</strong>{" "}
                  structure.
                </p>
                <p className="mt-1">
                  Assigning them to this structure will create a new record and
                  mark the current assignment as ended.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={handleAssignClick}
              disabled={saving || !selectedEmployeeId}
            >
              {saving ? "Assigning..." : "Assign Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Salary Structure?</AlertDialogTitle>
            <AlertDialogDescription>
              <div>
                {selectedEmployee?.name} is currently assigned to the{" "}
                <strong>{selectedEmployee?.currentStructureName}</strong>{" "}
                structure.
              </div>
              <div className="mt-2">
                Changing to <strong>{structureName}</strong> will:
              </div>
              <ul className="list-disc pl-5 mt-2">
                <li>
                  End their current structure assignment as of {effectiveDate}
                </li>
                <li>Create a new salary structure assignment record</li>
                <li>Update their payroll calculations going forward</li>
              </ul>
              <div className="mt-2">Do you want to continue?</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={assignEmployee}>
              Yes, Change Structure
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
