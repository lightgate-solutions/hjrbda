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
import { Edit, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getAllDeductions,
  deleteDeduction,
} from "@/actions/payroll/deductions";
import { formatCurrency } from "@/lib/utils";
import { DeductionFormDialog } from "./deduction-form-dialog";

const typeLabels: Record<string, string> = {
  "one-time": "One-time",
  recurring: "Recurring",
  statutory: "Statutory",
  loan: "Loan",
  advance: "Advance",
};

export function DeductionsTable() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDeduction, setSelectedDeduction] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const {
    data: deductions = [],
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["deductions"],
    queryFn: () => getAllDeductions(),
  });

  if (error) return toast.error("Failed to load deductions");

  const handleDelete = async () => {
    if (!selectedDeduction) return;

    try {
      const result = await deleteDeduction(
        selectedDeduction.id,
        window.location.pathname,
      );

      if (result.error) {
        toast.error(result.error.reason);
      } else if (result.success) {
        toast.success(result.success.reason);
        refetch();
      }
    } catch (_error) {
      toast.error("Failed to delete deduction");
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedDeduction(null);
    }
  };

  const handleEditComplete = () => {
    refetch();
    setIsEditDialogOpen(false);
    setSelectedDeduction(null);
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
        <DeductionFormDialog
          trigger={<Button>+ Create Deduction</Button>}
          onCompleteAction={() => refetch()}
        />
      </div>

      <Card className="shadow-sm rounded-none p-1">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deductions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No deductions found. Create your first deduction.
                  </TableCell>
                </TableRow>
              ) : (
                deductions.map((deduction) => (
                  <TableRow key={deduction.id}>
                    <TableCell className="font-medium">
                      {deduction.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeLabels[deduction.type] || deduction.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {deduction.percentage
                        ? `${deduction.percentage}% of base salary`
                        : formatCurrency(Number(deduction.amount || 0))}
                    </TableCell>
                    <TableCell>{deduction.createdBy}</TableCell>
                    <TableCell>
                      {new Date(deduction.updatedAt).toLocaleDateString()}
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
                            onClick={() => {
                              setSelectedDeduction(deduction);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedDeduction(deduction);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
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
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deduction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this deduction? This action cannot
              be undone. If this deduction is in use by any salary structure or
              assigned to employees, the deletion might fail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedDeduction && (
        <DeductionFormDialog
          isOpen={isEditDialogOpen}
          onOpenChangeAction={setIsEditDialogOpen}
          initial={selectedDeduction}
          onCompleteAction={handleEditComplete}
        />
      )}
    </div>
  );
}
