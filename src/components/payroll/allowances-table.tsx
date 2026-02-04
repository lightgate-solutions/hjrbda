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
  getAllAllowances,
  deleteAllowance,
} from "@/actions/payroll/allowances";
import { formatCurrency } from "@/lib/utils";
import { AllowanceFormDialog } from "./allowance-form-dialog";

const typeLabels: Record<string, string> = {
  "one-time": "One-time",
  monthly: "Monthly",
  annual: "Annual",
  "bi-annaul": "bi-annual",
  quarterly: "quarterly",
  custom: "custom",
};

export function AllowancesTable() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAllowance, setSelectedAllowance] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const {
    data: allowances = [],
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["allowances"],
    queryFn: () => getAllAllowances(),
  });

  if (error) return toast.error("Failed to load allowances");

  const handleDelete = async () => {
    if (!selectedAllowance) return;

    try {
      const result = await deleteAllowance(
        selectedAllowance.id,
        window.location.pathname,
      );

      if (result.error) {
        toast.error(result.error.reason);
      } else if (result.success) {
        toast.success(result.success.reason);
        refetch();
      }
    } catch (_error) {
      toast.error("Failed to delete allowance");
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedAllowance(null);
    }
  };

  const handleEditComplete = () => {
    refetch();
    setIsEditDialogOpen(false);
    setSelectedAllowance(null);
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
        <AllowanceFormDialog
          trigger={<Button>+ Create Allowance</Button>}
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
                <TableHead>Taxable</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allowances.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No allowances found. Create your first allowance.
                  </TableCell>
                </TableRow>
              ) : (
                allowances.map((allowance) => (
                  <TableRow key={allowance.id}>
                    <TableCell className="font-medium">
                      {allowance.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeLabels[allowance.type] || allowance.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {allowance.percentage
                        ? `${allowance.percentage}% of base salary`
                        : formatCurrency(Number(allowance.amount || 0))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={allowance.taxable ? "secondary" : "outline"}
                      >
                        {allowance.taxable
                          ? `Taxable (${allowance.taxPercentage}%)`
                          : "Non-taxable"}
                      </Badge>
                    </TableCell>
                    <TableCell>{allowance.createdBy}</TableCell>
                    <TableCell>
                      {new Date(allowance.updatedAt).toLocaleDateString()}
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
                              setSelectedAllowance(allowance);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedAllowance(allowance);
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
            <AlertDialogTitle>Delete Allowance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this allowance? This action cannot
              be undone. If this allowance is in use by any salary structure or
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

      {selectedAllowance && (
        <AllowanceFormDialog
          isOpen={isEditDialogOpen}
          onOpenChangeAction={setIsEditDialogOpen}
          initial={selectedAllowance}
          onCompleteAction={handleEditComplete}
        />
      )}
    </div>
  );
}
