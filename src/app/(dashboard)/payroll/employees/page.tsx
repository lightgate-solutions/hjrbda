"use client";

import { EmployeesTable } from "@/components/payroll/employees-table";

export default function EmployeesPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Employee Payroll Management</h1>
        <p className="text-muted-foreground">
          Manage employee salary structures, view take-home pay, and track
          compensation details
        </p>
      </div>

      <EmployeesTable />
    </div>
  );
}
