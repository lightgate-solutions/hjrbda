"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { Clock, UserPlus, UserMinus } from "lucide-react";
import { removeEmployeeFromStructure } from "@/actions/payroll/employee-salary";
import { EmployeeAssignmentDialog } from "@/components/payroll/employee-assignment-dialog";
import { EmployeeSalaryHistory } from "@/components/payroll/employee-salary-history";

type EmployeeProps = {
  id: number;
  name: string;
  staffNumber: string | null;
  department: string | null;
  role: string;
  salaryId: number;
  effectiveFrom: Date | null;
};

type Props = {
  structureId: number;
  structureName: string;
  baseSalary: string;
  initialEmployees: EmployeeProps[];
  isStructureActive: boolean;
};

export function EmployeeAssignmentTable({
  structureId,
  structureName,
  baseSalary,
  initialEmployees,
  isStructureActive,
}: Props) {
  const [employees, setEmployees] = useState<EmployeeProps[]>(initialEmployees);
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeProps | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setEmployees(initialEmployees);
  }, [initialEmployees]);

  const handleRemoveEmployee = async () => {
    if (!selectedEmployee) return;

    setRemoving(true);
    try {
      const result = await removeEmployeeFromStructure(
        selectedEmployee.salaryId,
        structureId,
        new Date(),
        window.location.pathname,
      );

      if (result.error) {
        toast.error(result.error.reason);
      } else if (result.success) {
        toast.success(result.success.reason);
        setEmployees((prev) =>
          prev.filter((emp) => emp.id !== selectedEmployee.id),
        );
      }
    } catch (_error) {
      toast.error("Failed to remove employee");
    } finally {
      setRemoving(false);
      setShowRemoveDialog(false);
      setSelectedEmployee(null);
    }
  };

  const handleAssignComplete = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <EmployeeAssignmentDialog
          trigger={
            <Button disabled={!isStructureActive}>
              <UserPlus className="mr-2 h-4 w-4" />
              Assign Employee
            </Button>
          }
          structureId={structureId}
          structureName={structureName}
          baseSalary={baseSalary}
          onCompleteAction={handleAssignComplete}
        />
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No employees are currently using this salary structure.
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Staff Number</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.staffNumber || "-"}</TableCell>
                  <TableCell>{employee.department || "-"}</TableCell>
                  <TableCell>{employee.role}</TableCell>
                  <TableCell>
                    {employee.effectiveFrom
                      ? employee.effectiveFrom.toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <EmployeeSalaryHistory
                        trigger={
                          <Button variant="outline" size="sm">
                            <Clock className="h-4 w-4" />
                          </Button>
                        }
                        employeeId={employee.id}
                        employeeName={employee.name}
                      />

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!isStructureActive}
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setShowRemoveDialog(true);
                        }}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Employee from Structure</AlertDialogTitle>
            <AlertDialogDescription>
              <span>
                Are you sure you want to remove{" "}
                <strong>{selectedEmployee?.name}</strong> from the{" "}
                <strong>{structureName}</strong> structure?
              </span>
              <span className="mt-2">
                This will end their current assignment effective immediately.
                The employee will not be assigned to any salary structure until
                you assign them to a new one.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveEmployee}
              disabled={removing}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {removing ? "Removing..." : "Remove Employee"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
