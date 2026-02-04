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
  assignEmployeeToStructure,
  removeEmployeeFromStructure,
} from "@/actions/payroll/employee-salary";
import { getAllSalaryStructures } from "@/actions/payroll/salary-structure";
import { formatCurrency } from "@/lib/utils";

type SalaryStructureOption = {
  id: number;
  name: string;
  baseSalary: string;
  active: boolean;
  employeeCount: number;
};

type Props = {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChangeAction?: (open: boolean) => void;
  onCompleteAction?: () => void;
  employeeId: number;
  employeeName: string;
  currentStructureId: number | null;
  currentStructureName: string | null;
};

export function EmployeeStructureAssignDialog({
  trigger,
  isOpen,
  onOpenChangeAction,
  onCompleteAction,
  employeeId,
  employeeName,
  currentStructureId,
  currentStructureName,
}: Props) {
  const [open, setOpen] = useState(isOpen || false);
  const [structures, setStructures] = useState<SalaryStructureOption[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState<string>("");
  const [selectedStructure, setSelectedStructure] =
    useState<SalaryStructureOption | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRemoveWarning, setShowRemoveWarning] = useState(false);
  const [showChangeWarning, setShowChangeWarning] = useState(false);

  // Handle controlled state from parent
  useEffect(() => {
    if (typeof isOpen !== "undefined") {
      setOpen(isOpen);
    }
  }, [isOpen]);

  useEffect(() => {
    if (open) {
      loadSalaryStructures();
    } else {
      setSelectedStructureId("");
      setSelectedStructure(null);
      setEffectiveDate(new Date().toISOString().split("T")[0]);
    }
  }, [open]);

  const loadSalaryStructures = async () => {
    setLoading(true);
    try {
      const structuresList = await getAllSalaryStructures();
      // Filter to only show active salary structures
      const activeStructures = structuresList.filter(
        (structure) => structure.active,
      );
      setStructures(activeStructures);

      if (activeStructures.length === 0) {
        setTimeout(() => {
          toast.info(
            "No active salary structures found. Please create at least one active salary structure.",
          );
        }, 500);
      }

      // If employee already has a structure, pre-select it
      if (currentStructureId) {
        const current = structuresList.find((s) => s.id === currentStructureId);
        if (current) {
          setSelectedStructureId(String(current.id));
          setSelectedStructure(current);
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load salary structures",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStructureChange = (structureId: string) => {
    setSelectedStructureId(structureId);
    const structure =
      structures.find((s) => s.id.toString() === structureId) || null;
    setSelectedStructure(structure);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (onOpenChangeAction) {
      onOpenChangeAction(newOpen);
    }
  };

  const handleAssignClick = () => {
    if (!selectedStructure) {
      toast.error("Please select a salary structure");
      return;
    }

    // If employee already has a structure
    if (currentStructureId) {
      if (currentStructureId === selectedStructure.id) {
        toast.info("Employee is already assigned to this structure");
        return;
      } else {
        // Changing to a different structure
        setShowChangeWarning(true);
      }
    } else {
      // New assignment
      assignStructure();
    }
  };

  const handleRemoveClick = () => {
    if (!currentStructureId) {
      toast.error("Employee is not assigned to any salary structure");
      return;
    }

    setShowRemoveWarning(true);
  };

  const assignStructure = async () => {
    if (!selectedStructure || !effectiveDate) {
      toast.error("Please select a salary structure and effective date");
      return;
    }

    setSaving(true);
    try {
      const result = await assignEmployeeToStructure(
        {
          employeeId,
          salaryStructureId: selectedStructure.id,
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
      toast.error("Failed to assign salary structure");
    } finally {
      setSaving(false);
      setShowChangeWarning(false);
    }
  };

  const removeStructure = async () => {
    if (!currentStructureId) {
      return;
    }

    setSaving(true);
    try {
      const result = await removeEmployeeFromStructure(
        // This is the employee salary ID which we don't have directly, will need adjustment
        // In a real implementation, we might need to fetch this or adjust the API
        0, // This would need to be the actual salaryId
        currentStructureId,
        new Date(effectiveDate),
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
      toast.error("Failed to remove salary structure");
    } finally {
      setSaving(false);
      setShowRemoveWarning(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Salary Structure</DialogTitle>
            <DialogDescription>
              {currentStructureId
                ? `${employeeName} is currently assigned to the ${currentStructureName} structure. You can change or remove this assignment.`
                : `Assign ${employeeName} to a salary structure.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="structure">Select Salary Structure *</Label>
                {!loading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadSalaryStructures}
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
                  value={selectedStructureId}
                  onValueChange={handleStructureChange}
                >
                  <SelectTrigger id="structure">
                    <SelectValue placeholder="Select a salary structure" />
                  </SelectTrigger>
                  <SelectContent>
                    {structures.length === 0 ? (
                      <div className="py-4 text-center text-sm space-y-2">
                        <div className="text-amber-500 font-medium">
                          No active salary structures available
                        </div>
                      </div>
                    ) : (
                      structures.map((structure) => (
                        <SelectItem
                          key={structure.id}
                          value={structure.id.toString()}
                        >
                          <div className="flex flex-col">
                            <span>{structure.name}</span>
                            <span className="text-xs text-muted-foreground">
                              Base:{" "}
                              {formatCurrency(Number(structure.baseSalary))}
                            </span>
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

            {currentStructureId &&
              selectedStructureId &&
              currentStructureId.toString() !== selectedStructureId && (
                <div className="rounded-md bg-amber-50 p-3 text-amber-800 text-sm">
                  <p>
                    <strong>Note:</strong> You are changing this employee's
                    salary structure from{" "}
                    <strong>{currentStructureName}</strong> to{" "}
                    <strong>{selectedStructure?.name}</strong>.
                  </p>
                  <p className="mt-1">
                    This will end the current assignment and create a new
                    record.
                  </p>
                </div>
              )}
          </div>

          <DialogFooter className="space-x-2">
            {currentStructureId && (
              <Button
                onClick={handleRemoveClick}
                disabled={saving}
                variant="outline"
                className="mr-auto"
              >
                {saving ? "Removing..." : "Remove Assignment"}
              </Button>
            )}
            <Button
              onClick={handleAssignClick}
              disabled={
                saving || !selectedStructureId || structures.length === 0
              }
            >
              {saving
                ? "Assigning..."
                : currentStructureId
                  ? "Change Structure"
                  : "Assign Structure"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Structure Warning Dialog */}
      <AlertDialog open={showChangeWarning} onOpenChange={setShowChangeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Salary Structure?</AlertDialogTitle>
            <div className="text-sm text-muted-foreground">
              <div>
                {employeeName} is currently assigned to the{" "}
                <strong>{currentStructureName}</strong> structure.
              </div>
              <div className="mt-2">
                Changing to <strong>{selectedStructure?.name}</strong> will:
              </div>
              <ul className="list-disc pl-5 mt-2">
                <li>
                  End their current structure assignment as of {effectiveDate}
                </li>
                <li>Create a new salary structure assignment record</li>
                <li>
                  Change their base salary from{" "}
                  {currentStructureId
                    ? structures.find((s) => s.id === currentStructureId)
                        ?.baseSalary
                      ? formatCurrency(
                          Number(
                            structures.find((s) => s.id === currentStructureId)
                              ?.baseSalary,
                          ),
                        )
                      : "unknown"
                    : "unknown"}{" "}
                  to{" "}
                  {selectedStructure?.baseSalary
                    ? formatCurrency(Number(selectedStructure.baseSalary))
                    : "unknown"}
                </li>
              </ul>
              <div className="mt-2">Do you want to continue?</div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={assignStructure}>
              Yes, Change Structure
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Structure Warning Dialog */}
      <AlertDialog open={showRemoveWarning} onOpenChange={setShowRemoveWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Salary Structure?</AlertDialogTitle>
            <AlertDialogDescription>
              <div>
                Are you sure you want to remove {employeeName}'s assignment to
                the <strong>{currentStructureName}</strong> structure?
              </div>
              <div className="mt-2">This will:</div>
              <ul className="list-disc pl-5 mt-2">
                <li>
                  End their current structure assignment as of {effectiveDate}
                </li>
                <li>Remove them from payroll calculations</li>
                <li>
                  They will not be assigned to any salary structure until you
                  assign them again
                </li>
              </ul>
              <div className="mt-2">Do you want to continue?</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeStructure}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Yes, Remove Assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
