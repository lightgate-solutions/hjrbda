"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { getAllLoanTypes, deleteLoanType } from "@/actions/loans/loans";
import LoanTypeForm from "./loan-type-form";

interface LoanTypesTableProps {
  employeeId: number;
}

export default function LoanTypesTable({ employeeId }: LoanTypesTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["loan-types"],
    queryFn: () => getAllLoanTypes({ limit: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLoanType,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        queryClient.invalidateQueries({ queryKey: ["loan-types"] });
      } else {
        toast.error(result.error?.reason || "Failed to delete");
      }
    },
  });

  const loanTypes = data?.loanTypes || [];

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "NGN",
    }).format(Number(amount));
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading loan types...
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <Card className="p-4 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Loan Types</CardTitle>
              <CardDescription>
                Configure loan types and eligibility rules
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Loan Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loanTypes.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No loan types configured.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount Type</TableHead>
                  <TableHead>Max Amount/Percentage</TableHead>
                  <TableHead>Tenure</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loanTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{type.name}</p>
                        {type.description && (
                          <p className="text-xs text-muted-foreground">
                            {type.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {type.amountType === "fixed" ? "Fixed" : "Percentage"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {type.amountType === "fixed"
                        ? formatCurrency(type.fixedAmount)
                        : `${type.maxPercentage}%`}
                    </TableCell>
                    <TableCell>{type.tenureMonths} months</TableCell>
                    <TableCell>{type.interestRate || 0}% p.a.</TableCell>
                    <TableCell>
                      {type.isActive ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingType(type.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (
                              confirm(
                                "Are you sure you want to delete this loan type?",
                              )
                            ) {
                              deleteMutation.mutate(type.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Loan Type Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-11/12 overflow-auto">
          <DialogHeader>
            <DialogTitle>Create Loan Type</DialogTitle>
            <DialogDescription>
              Configure a new loan type with eligibility rules
            </DialogDescription>
          </DialogHeader>
          <LoanTypeForm
            employeeId={employeeId}
            onSuccess={() => {
              setShowForm(false);
              queryClient.invalidateQueries({ queryKey: ["loan-types"] });
            }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Loan Type Dialog */}
      <Dialog
        open={!!editingType}
        onOpenChange={(open) => !open && setEditingType(null)}
      >
        <DialogContent className="max-w-2xl max-h-11/12 overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Loan Type</DialogTitle>
            <DialogDescription>
              Update loan type configuration
            </DialogDescription>
          </DialogHeader>
          {editingType && (
            <LoanTypeForm
              employeeId={employeeId}
              loanTypeId={editingType}
              onSuccess={() => {
                setEditingType(null);
                queryClient.invalidateQueries({ queryKey: ["loan-types"] });
              }}
              onCancel={() => setEditingType(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
