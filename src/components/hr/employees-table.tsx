/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import EmployeeEditForm from "./employee-edit-dialog";
import EmployeeProfileView from "./employee-profile-dialog";
import EmployeeDocuments from "./employee-documents";
import EmployeeBankDetails from "./employee-bank-details";
import EmployeeHistory from "./employee-history";
import { Edit, Eye } from "lucide-react";
import { getAllEmployees } from "@/actions/hr/employees";
import EmployeesTableSkeleton from "./employees-table-skeleton";

export default function EmployeesTable() {
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["get-all-employees"],
    queryFn: () => getAllEmployees(),
  });

  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | null>(null);

  if (isLoading) return <EmployeesTableSkeleton />;

  if (employees.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No employees found.
      </div>
    );
  }

  return (
    <section>
      <Card className="p-4 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Employees</CardTitle>
          <CardDescription>
            All registered employees of HJRBDA management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Employment Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={``} alt={employee.name} />
                      <AvatarFallback>
                        {employee.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.dateOfBirth || "N/A"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {employee.staffNumber || "N/A"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{employee.role}</Badge>
                  </TableCell>
                  <TableCell>{employee.department || "-"}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge>{employee.employmentType || "N/A"}</Badge>
                  </TableCell>
                  <TableCell className="flex text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setMode("view");
                      }}
                      title="View Employee Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setMode("edit");
                      }}
                      title="Edit Employee"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet
        open={!!selectedEmployee && mode === "view"}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEmployee(null);
            setMode(null);
          }
        }}
      >
        <SheetContent className="overflow-y-auto w-[600px] sm:min-w-4xl p-4">
          <SheetHeader>
            <SheetTitle>Employee Details</SheetTitle>
            <SheetDescription>View employee information</SheetDescription>
          </SheetHeader>

          <div className="mt-4">
            <Tabs defaultValue="information" className="gap-4">
              <TabsList className="bg-background justify-start w-full rounded-none border-b p-0">
                <TabsTrigger
                  value="information"
                  className="border-b-border dark:data-[state=active]:bg-background data-[state=active]:border-border data-[state=active]:border-b-background h-full rounded-none rounded-t border border-transparent data-[state=active]:-mb-0.5 data-[state=active]:shadow-none dark:border-b-0 dark:data-[state=active]:-mb-0.5"
                >
                  Information
                </TabsTrigger>

                <TabsTrigger
                  value="documents"
                  className="border-b-border dark:data-[state=active]:bg-background data-[state=active]:border-border data-[state=active]:border-b-background h-full rounded-none rounded-t border border-transparent data-[state=active]:-mb-0.5 data-[state=active]:shadow-none dark:border-b-0 dark:data-[state=active]:-mb-0.5"
                >
                  Documents
                </TabsTrigger>

                <TabsTrigger
                  value="account"
                  className="border-b-border dark:data-[state=active]:bg-background data-[state=active]:border-border data-[state=active]:border-b-background h-full rounded-none rounded-t border border-transparent data-[state=active]:-mb-0.5 data-[state=active]:shadow-none dark:border-b-0 dark:data-[state=active]:-mb-0.5"
                >
                  Employee Account
                </TabsTrigger>

                <TabsTrigger
                  value="history"
                  className="border-b-border dark:data-[state=active]:bg-background data-[state=active]:border-border data-[state=active]:border-b-background h-full rounded-none rounded-t border border-transparent data-[state=active]:-mb-0.5 data-[state=active]:shadow-none dark:border-b-0 dark:data-[state=active]:-mb-0.5"
                >
                  Employee History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="information">
                {selectedEmployee && (
                  <EmployeeProfileView employee={selectedEmployee} />
                )}
              </TabsContent>

              <TabsContent value="documents">
                {selectedEmployee && (
                  <EmployeeDocuments
                    employeeId={selectedEmployee.id}
                    employeeName={selectedEmployee.name}
                  />
                )}
              </TabsContent>

              <TabsContent value="account">
                {selectedEmployee && (
                  <EmployeeBankDetails
                    employeeId={selectedEmployee.id}
                    employeeName={selectedEmployee.name}
                  />
                )}
              </TabsContent>

              <TabsContent value="history">
                {selectedEmployee && (
                  <EmployeeHistory
                    employeeId={selectedEmployee.id}
                    employeeName={selectedEmployee.name}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!selectedEmployee && mode === "edit"}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEmployee(null);
            setMode(null);
          }
        }}
      >
        <DialogContent className="min-w-[45rem] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee details</DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <EmployeeEditForm
              employee={selectedEmployee}
              onCloseAction={() => {
                setSelectedEmployee(null);
                setMode(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
