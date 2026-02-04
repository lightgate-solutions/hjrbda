/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSalaryStructure } from "@/actions/payroll/salary-structure";
import { formatCurrency } from "@/lib/utils";
import { getEmployeesBySalaryStructure } from "@/actions/payroll/employee-salary";
import { EmployeeAssignmentTable } from "@/components/payroll/employee-assignment-table";
import { StructureAllowancesTable } from "@/components/payroll/structure-allowances-table";
import { StructureDeductionsTable } from "@/components/payroll/structure-deductions-table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStructureAllowances } from "@/actions/payroll/salary-allowances";
import { getStructureDeductions } from "@/actions/payroll/salary-deductions";

// Helper function to calculate allowance amount
function calculateAllowanceAmount(allowance: any, baseSalary: number): number {
  if (allowance.percentage) {
    return (baseSalary * parseFloat(allowance.percentage)) / 100;
  }
  return Number(allowance.amount || 0);
}

// Helper function to calculate tax amount on an allowance
function calculateTaxAmount(allowance: any, baseSalary: number): number {
  if (!allowance.taxable || !allowance.taxPercentage) return 0;

  let allowanceAmount = 0;
  if (allowance.percentage) {
    allowanceAmount = (baseSalary * parseFloat(allowance.percentage)) / 100;
  } else if (allowance.amount) {
    allowanceAmount = parseFloat(allowance.amount);
  }

  return (allowanceAmount * parseFloat(allowance.taxPercentage)) / 100;
}

// Helper function to calculate deduction amount
function calculateDeductionAmount(deduction: any, baseSalary: number): number {
  if (deduction.percentage) {
    return (baseSalary * parseFloat(deduction.percentage)) / 100;
  }
  return Number(deduction.amount || 0);
}

export default async function StructureDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const structureId = parseInt(params.id, 10);
  const structure = await getSalaryStructure(structureId);

  if (!structure) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Structure Not Found</h1>
          <Link href="/payroll/structure">
            <Button>Back to Structures</Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              The requested salary structure could not be found. It may have
              been deleted or the ID is incorrect.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assignedEmployees = await getEmployeesBySalaryStructure(structureId);
  const allowances = await getStructureAllowances(structureId);
  const deductions = await getStructureDeductions(structureId);

  // Calculate base salary as a number
  const baseSalary =
    typeof structure.baseSalary === "string"
      ? parseFloat(structure.baseSalary)
      : structure.baseSalary;

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // Calculate total allowances (after tax) - only include those that are currently effective
  let totalAllowances = 0;
  allowances.forEach((allowance) => {
    // Check if the allowance is currently effective
    const effectiveFrom = allowance.effectiveFrom
      ? new Date(allowance.effectiveFrom)
      : null;
    const effectiveTo = allowance.effectiveTo
      ? new Date(allowance.effectiveTo)
      : null;

    if (effectiveFrom) effectiveFrom.setHours(0, 0, 0, 0);
    if (effectiveTo) effectiveTo.setHours(23, 59, 59, 999);

    const isStarted = !effectiveFrom || effectiveFrom <= currentDate;
    const isNotEnded = !effectiveTo || effectiveTo >= currentDate;

    if (isStarted && isNotEnded) {
      const allowanceAmount = calculateAllowanceAmount(allowance, baseSalary);
      const taxAmount = calculateTaxAmount(allowance, baseSalary);
      totalAllowances += allowanceAmount - taxAmount;
    }
  });

  // Calculate total deductions - only include those that are currently effective
  let totalDeductions = 0;
  deductions.forEach((deduction) => {
    // Check if the deduction is currently effective
    const effectiveFrom = deduction.effectiveFrom
      ? new Date(deduction.effectiveFrom)
      : null;
    const effectiveTo = deduction.effectiveTo
      ? new Date(deduction.effectiveTo)
      : null;

    if (effectiveFrom) effectiveFrom.setHours(0, 0, 0, 0);
    if (effectiveTo) effectiveTo.setHours(23, 59, 59, 999);

    const isStarted = !effectiveFrom || effectiveFrom <= currentDate;
    const isNotEnded = !effectiveTo || effectiveTo >= currentDate;

    if (isStarted && isNotEnded) {
      totalDeductions += calculateDeductionAmount(deduction, baseSalary);
    }
  });

  // Calculate net take-home amount
  const netTakeHome = baseSalary + totalAllowances - totalDeductions;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{structure.name}</h1>
          <Badge
            variant={structure.active ? "default" : "destructive"}
            className="text-sm"
          >
            {structure.active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <Link href="/payroll/structure">
          <Button variant="outline">Back to Structures</Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Structure Details</CardTitle>
          <CardDescription>
            Basic information about this salary structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Base Salary
              </h3>
              <p className="font-semibold">
                {formatCurrency(Number(structure.baseSalary))}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Total Allowances
                <span className="text-xs ml-1 text-muted-foreground">
                  (Current)
                </span>
              </h3>
              <p className="font-semibold text-green-600">
                {formatCurrency(totalAllowances)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Total Deductions
                <span className="text-xs ml-1 text-muted-foreground">
                  (Current)
                </span>
              </h3>
              <p className="font-semibold text-red-600">
                {formatCurrency(totalDeductions)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Net Take-Home
                <span className="text-xs ml-1 text-muted-foreground">
                  (Current)
                </span>
              </h3>
              <p className="font-semibold text-lg text-green-600">
                {formatCurrency(netTakeHome)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Status
              </h3>
              <p className="font-semibold">
                {structure.active ? "Active" : "Inactive"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Last Updated
              </h3>
              <p className="font-semibold">
                {structure.updatedAt
                  ? new Date(structure.updatedAt).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Created By
              </h3>
              <p className="font-semibold">{structure.createdBy}</p>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Description
            </h3>
            <p className="text-base">{structure.description}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="employees" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="allowances">Allowances</TabsTrigger>
          <TabsTrigger value="deductions">Deductions</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Assigned Employees</CardTitle>
                <CardDescription>
                  Employees currently using this salary structure (
                  {structure.employeeCount})
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <EmployeeAssignmentTable
                structureId={structureId}
                structureName={structure.name}
                baseSalary={structure.baseSalary}
                initialEmployees={assignedEmployees}
                isStructureActive={structure.active}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allowances">
          <Card>
            <CardHeader>
              <CardTitle>Structure Allowances</CardTitle>
              <CardDescription>
                Allowances applied to this salary structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StructureAllowancesTable
                structureId={structureId}
                baseSalary={structure.baseSalary}
                isStructureActive={structure.active}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deductions">
          <Card>
            <CardHeader>
              <CardTitle>Structure Deductions</CardTitle>
              <CardDescription>
                Deductions applied to this salary structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StructureDeductionsTable
                structureId={structureId}
                baseSalary={structure.baseSalary}
                isStructureActive={structure.active}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
