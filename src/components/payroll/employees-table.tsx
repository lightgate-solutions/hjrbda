/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */

"use client";

import { useQuery } from "@tanstack/react-query";
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
import { useState, Fragment } from "react";
import {
  DollarSign,
  FileText,
  Landmark,
  MoreVertical,
  PlusCircle,
  UserCog,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  getAllEmployeesWithPayroll,
  calculateEmployeeTakeHomePay,
} from "@/actions/payroll/employee-payroll";
import { EmployeeSalaryHistory } from "./employee-salary-history";
import { EmployeeStructureAssignDialog } from "./employee-structure-assign-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeeAllowanceDialog } from "../payroll/employee-allowance-dialog";
import { EmployeeDeductionDialog } from "../payroll/employee-deduction-dialog";

export function EmployeesTable() {
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [showPayDetails, setShowPayDetails] = useState<number | null>(null);
  const [takeHomeDetails, setTakeHomeDetails] = useState<any | null>(null);
  const [isCalculatingPay, setIsCalculatingPay] = useState(false);
  const [allowanceDialogOpen, setAllowanceDialogOpen] = useState(false);
  const [deductionDialogOpen, setDeductionDialogOpen] = useState(false);

  const {
    data: employees = [],
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["employees-payroll"],
    queryFn: () => getAllEmployeesWithPayroll(),
  });

  if (error) {
    toast.error("Failed to load employees");
  }

  const handleAssignStructure = (employee: any) => {
    setSelectedEmployee(employee);
    setIsAssignDialogOpen(true);
  };

  const handleViewTakeHome = async (employeeId: number) => {
    if (showPayDetails === employeeId) {
      setShowPayDetails(null);
      setTakeHomeDetails(null);
      return;
    }

    setIsCalculatingPay(true);
    setShowPayDetails(employeeId);

    try {
      const details = await calculateEmployeeTakeHomePay(employeeId);
      setTakeHomeDetails(details);
    } catch (_error) {
      toast.error("Failed to calculate take-home pay");
    } finally {
      setIsCalculatingPay(false);
    }
  };

  const handleAssignComplete = () => {
    refetch();
    setIsAssignDialogOpen(false);
    setSelectedEmployee(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/3 rounded bg-muted animate-pulse"></div>
        <div className="h-96 rounded bg-muted animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm rounded-none p-1">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Staff ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Salary Structure</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>Take-home</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No employees found.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee, idx) => (
                  <Fragment key={idx}>
                    <TableRow>
                      <TableCell className="font-medium">
                        {employee.name}
                      </TableCell>
                      <TableCell>{employee.staffNumber || "-"}</TableCell>
                      <TableCell>{employee.department || "-"}</TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell>
                        {employee.structureName ? (
                          employee.structureName
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-800"
                          >
                            Not Assigned
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {employee.baseSalary
                          ? formatCurrency(Number(employee.baseSalary))
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {employee.structureId ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTakeHome(employee.id)}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            {showPayDetails === employee.id ? "Hide" : "View"}
                          </Button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
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
                              onClick={() => handleAssignStructure(employee)}
                            >
                              {employee.structureId ? (
                                <div className="flex py-1 items-center w-full">
                                  <UserCog className="mr-2 h-4 w-4" />
                                  Change Structure
                                </div>
                              ) : (
                                <div className="flex py-1 items-center w-full">
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Assign Structure
                                </div>
                              )}
                            </DropdownMenuItem>
                            {employee.structureId && (
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                              >
                                <EmployeeSalaryHistory
                                  trigger={
                                    <div className="flex py-1 items-center w-full">
                                      <FileText className="mr-2 h-4 w-4" />
                                      Salary History
                                    </div>
                                  }
                                  employeeId={employee.id}
                                  employeeName={employee.name}
                                />
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  setAllowanceDialogOpen(true);
                                }}
                                className="pl-0"
                                title="Manage Allowances"
                              >
                                <div className="flex items-center w-full">
                                  <Wallet className="mr-2 h-4 w-4" />
                                  Manage Allowance
                                </div>
                              </Button>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                className="pl-0"
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  setDeductionDialogOpen(true);
                                }}
                                title="Manage Deductions"
                              >
                                <div className="flex items-center w-full">
                                  <Landmark className="mr-2 h-4 w-4" />
                                  Manage Deduction
                                </div>
                              </Button>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {showPayDetails === employee.id && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={8} className="p-4">
                          {isCalculatingPay ? (
                            <div className="py-4 space-y-2">
                              <Skeleton className="h-4 w-1/3" />
                              <Skeleton className="h-4 w-1/2" />
                              <Skeleton className="h-4 w-1/4" />
                            </div>
                          ) : takeHomeDetails ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 gap-4">
                                <div className="p-3 border rounded-md">
                                  <div className="text-sm font-medium text-muted-foreground mb-1">
                                    Base Salary
                                  </div>
                                  <div className="font-semibold">
                                    {formatCurrency(takeHomeDetails.baseSalary)}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-2">
                                    Allowances (
                                    {takeHomeDetails.allowances.length})
                                  </h4>
                                  {takeHomeDetails.allowances.length > 0 ? (
                                    <div className="border rounded-md overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Period</TableHead>
                                            <TableHead>Amount</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {takeHomeDetails.allowances.map(
                                            (allowance: any, idx: number) => (
                                              <TableRow key={idx}>
                                                <TableCell>
                                                  {allowance.name}
                                                </TableCell>
                                                <TableCell>
                                                  {allowance.type}
                                                </TableCell>
                                                <TableCell>
                                                  {allowance.taxable ? (
                                                    <div>
                                                      <div className="text-sm font-medium">
                                                        {formatCurrency(
                                                          allowance.calculatedGross,
                                                        )}
                                                      </div>
                                                      {allowance.taxAmount >
                                                        0 && (
                                                        <div className="text-xs text-red-500 mt-1">
                                                          -Tax:{" "}
                                                          {formatCurrency(
                                                            allowance.taxAmount,
                                                          )}
                                                        </div>
                                                      )}
                                                      <div className="text-xs mt-1 font-medium">
                                                        Net:{" "}
                                                        {formatCurrency(
                                                          allowance.calculatedValue,
                                                        )}
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    formatCurrency(
                                                      allowance.calculatedValue,
                                                    )
                                                  )}
                                                </TableCell>
                                              </TableRow>
                                            ),
                                          )}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  ) : (
                                    <div className="text-muted-foreground text-sm border rounded-md p-3">
                                      No allowances
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <h4 className="font-medium mb-2">
                                    Deductions (
                                    {takeHomeDetails.deductions.length})
                                  </h4>
                                  {takeHomeDetails.deductions.length > 0 ? (
                                    <div className="border rounded-md overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Amount</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {takeHomeDetails.deductions.map(
                                            (deduction: any, idx: number) => (
                                              <TableRow key={idx}>
                                                <TableCell>
                                                  {deduction.name}
                                                </TableCell>
                                                <TableCell>
                                                  {deduction.type}
                                                </TableCell>
                                                <TableCell>
                                                  {formatCurrency(
                                                    deduction.calculatedValue,
                                                  )}
                                                </TableCell>
                                              </TableRow>
                                            ),
                                          )}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  ) : (
                                    <div className="text-muted-foreground text-sm border rounded-md p-3">
                                      No deductions
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="py-4 text-muted-foreground">
                              Error loading take-home details
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedEmployee && (
        <EmployeeStructureAssignDialog
          isOpen={isAssignDialogOpen}
          onOpenChangeAction={setIsAssignDialogOpen}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.name}
          currentStructureId={selectedEmployee.structureId}
          currentStructureName={selectedEmployee.structureName}
          onCompleteAction={handleAssignComplete}
        />
      )}

      {/* Employee Allowance Dialog */}
      <EmployeeAllowanceDialog
        isOpen={allowanceDialogOpen && !!selectedEmployee}
        onOpenChangeAction={(open) => {
          if (!open) setAllowanceDialogOpen(false);
        }}
        employeeId={selectedEmployee?.id}
        employeeName={selectedEmployee?.name}
      />

      {/* Employee Deduction Dialog */}
      <EmployeeDeductionDialog
        isOpen={deductionDialogOpen && !!selectedEmployee}
        onOpenChangeAction={(open) => {
          if (!open) setDeductionDialogOpen(false);
        }}
        employeeId={selectedEmployee?.id}
        employeeName={selectedEmployee?.name}
      />
    </div>
  );
}
