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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { listContractors, deleteContractor } from "@/actions/contractors";
import ContractorForm, { type ContractorRow } from "./contractor-form";
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

export default function ContractorsTable() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["contractors"],
    queryFn: () => listContractors({ limit: 100 }),
  });

  const [selectedContractor, setSelectedContractor] =
    useState<ContractorRow | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [contractorToDelete, setContractorToDelete] = useState<number | null>(
    null,
  );

  const contractors = data?.contractors || [];

  async function handleDelete() {
    if (!contractorToDelete) return;
    const result = await deleteContractor(contractorToDelete);
    if (result.success) {
      toast.success("Contractor deleted");
      refetch();
    } else {
      toast.error(result.error?.reason || "Failed to delete");
    }
    setContractorToDelete(null);
  }

  if (isLoading) return <div>Loading contractors...</div>;

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Contractors</h1>
          <p className="text-muted-foreground">
            Manage project contractors and vendors
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedContractor(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Contractor
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No contractors found.
                  </TableCell>
                </TableRow>
              ) : (
                contractors.map((contractor) => (
                  <TableRow key={contractor.id}>
                    <TableCell className="font-medium">
                      {contractor.name}
                    </TableCell>
                    <TableCell>{contractor.specialization || "-"}</TableCell>
                    <TableCell>{contractor.email || "-"}</TableCell>
                    <TableCell>{contractor.phone || "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedContractor(contractor);
                          setIsFormOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setContractorToDelete(contractor.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedContractor ? "Edit Contractor" : "Add Contractor"}
            </DialogTitle>
            <DialogDescription>
              Enter the contractor details below.
            </DialogDescription>
          </DialogHeader>
          <ContractorForm
            contractor={selectedContractor}
            onSuccess={() => {
              setIsFormOpen(false);
              refetch();
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!contractorToDelete}
        onOpenChange={(open) => !open && setContractorToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              contractor.
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
    </section>
  );
}
