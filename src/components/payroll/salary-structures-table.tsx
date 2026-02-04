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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Edit, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  getAllSalaryStructures,
  toggleSalaryStructureStatus,
} from "@/actions/payroll/salary-structure";
import { formatCurrency } from "@/lib/utils";
import { SalaryStructureFormDialog } from "./salary-structure-form-dialog";

export function SalaryStructuresTable() {
  const router = useRouter();
  const [isToggleDialogOpen, setIsToggleDialogOpen] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const {
    data: structures = [],
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["salary-structures"],
    queryFn: () => getAllSalaryStructures(),
  });

  if (error) return toast.error(error.message);

  const handleToggleStatus = async () => {
    if (!selectedStructure) return;

    const result = await toggleSalaryStructureStatus(
      selectedStructure.id,
      !selectedStructure.active,
      window.location.pathname,
    );

    if (result.error) {
      toast.error(result.error.reason);
    } else if (result.success) {
      toast.success(result.success.reason);
      refetch();
    }

    setIsToggleDialogOpen(false);
    setSelectedStructure(null);
  };

  const handleEditComplete = () => {
    refetch();
    setIsEditDialogOpen(false);
    setSelectedStructure(null);
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
      <div className="flex justify-end items-center">
        <SalaryStructureFormDialog
          trigger={<Button>+ Create Structure</Button>}
          onCompleteAction={() => refetch()}
        />
      </div>

      <Card className="shadow-sm rounded-none p-1">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {structures.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No salary structures found. Create your first structure.
                  </TableCell>
                </TableRow>
              ) : (
                structures.map((structure) => (
                  <TableRow
                    key={structure.id}
                    onClick={() =>
                      router.push(`/payroll/structure/${structure.id}`)
                    }
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">
                      {structure.name}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(Number(structure.baseSalary))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={structure.active ? "default" : "destructive"}
                      >
                        {structure.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{structure.employeeCount}</TableCell>
                    <TableCell>{structure.createdBy}</TableCell>
                    <TableCell>
                      {new Date(structure.updatedAt).toLocaleDateString()}
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
                          {/* Removed redundant View MenuItem as the row is now clickable */}
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStructure(structure);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStructure(structure);
                              setIsToggleDialogOpen(true);
                            }}
                          >
                            {structure.active ? (
                              <span className="text-destructive flex items-center">
                                <span className="mr-2">●</span>
                                Deactivate
                              </span>
                            ) : (
                              <span className="text-green-600 flex items-center">
                                <span className="mr-2">●</span>
                                Activate
                              </span>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={isToggleDialogOpen}
        onOpenChange={setIsToggleDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedStructure?.active
                ? "Deactivate Salary Structure"
                : "Activate Salary Structure"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStructure?.active
                ? "Are you sure you want to deactivate this salary structure? This will prevent it from being assigned to new employees."
                : "Are you sure you want to activate this salary structure? This will make it available for assignment to employees."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus}>
              {selectedStructure?.active ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedStructure && (
        <SalaryStructureFormDialog
          isOpen={isEditDialogOpen}
          onOpenChangeAction={setIsEditDialogOpen}
          initial={selectedStructure}
          onCompleteAction={handleEditComplete}
        />
      )}
    </div>
  );
}
