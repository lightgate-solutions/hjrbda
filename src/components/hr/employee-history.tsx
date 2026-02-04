/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const employmentHistorySchema = z.object({
  employeeId: z.number(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  department: z.string().nullable(),
  employmentType: z
    .enum(["Full-time", "Part-time", "Contract", "Intern"])
    .nullable(),
});

import {
  type EmploymentHistoryFormValues,
  addEmploymentHistory,
  deleteEmploymentHistory,
  getEmployeeHistory,
  updateEmploymentHistory,
} from "@/actions/hr/employee-history";
import z from "zod";

interface EmploymentHistoryProps {
  employeeId: number;
  employeeName: string;
}

type FormMode = "add" | "edit";

export default function EmployeeHistory({
  employeeId,
  employeeName,
}: EmploymentHistoryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("add");
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(
    null,
  );

  const queryClient = useQueryClient();

  // Fetch employee history records
  const { data: historyRecords = [], isLoading } = useQuery({
    queryKey: ["employee-history", employeeId],
    queryFn: () => getEmployeeHistory(employeeId),
  });

  // Setup form
  const form = useForm<EmploymentHistoryFormValues>({
    resolver: zodResolver(employmentHistorySchema),
    defaultValues: {
      employeeId: employeeId,
      startDate: null,
      endDate: null,
      department: null,
      employmentType: null,
    },
  });

  // Add mutation
  const addMutation = useMutation({
    mutationFn: addEmploymentHistory,
    onSuccess: () => {
      toast.success("Employment history added successfully");
      queryClient.invalidateQueries({
        queryKey: ["employee-history", employeeId],
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast.error("Failed to add employment history");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: EmploymentHistoryFormValues) => {
      if (!selectedHistoryId) throw new Error("No history ID selected");
      return updateEmploymentHistory(selectedHistoryId, data);
    },
    onSuccess: () => {
      toast.success("Employment history updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["employee-history", employeeId],
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast.error("Failed to update employment history");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEmploymentHistory(id),
    onSuccess: () => {
      toast.success("Employment history deleted successfully");
      queryClient.invalidateQueries({
        queryKey: ["employee-history", employeeId],
      });
    },
    onError: () => {
      toast.error("Failed to delete employment history");
    },
  });

  const onSubmit = (data: EmploymentHistoryFormValues) => {
    if (formMode === "add") {
      addMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const handleEdit = (history: any) => {
    setFormMode("edit");
    setSelectedHistoryId(history.id);
    form.reset({
      employeeId: employeeId,
      startDate: history.startDate
        ? format(new Date(history.startDate), "yyyy-MM-dd")
        : null,
      endDate: history.endDate
        ? format(new Date(history.endDate), "yyyy-MM-dd")
        : null,
      department: history.department,
      employmentType: history.employmentType,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddNew = () => {
    setFormMode("add");
    form.reset({
      employeeId: employeeId,
      startDate: null,
      endDate: null,
      department: null,
      employmentType: null,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div className="py-4">Loading employment history...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Employment History</CardTitle>
          <CardDescription>
            Track {employeeName}'s employment journey
          </CardDescription>
        </div>
        <Button onClick={handleAddNew} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Record
        </Button>
      </CardHeader>
      <CardContent>
        {historyRecords.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            No employment history records found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Employment Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyRecords.map((history) => (
                <TableRow key={history.id}>
                  <TableCell>{history.department || "-"}</TableCell>
                  <TableCell>
                    {history.employmentType ? (
                      <Badge variant="outline">{history.employmentType}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {history.startDate
                      ? format(new Date(history.startDate), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {history.endDate
                      ? format(new Date(history.endDate), "MMM d, yyyy")
                      : "Current"}
                  </TableCell>
                  <TableCell className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(history)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-white"
                      onClick={() => handleDelete(history.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formMode === "add"
                ? "Add Employment Record"
                : "Edit Employment Record"}
            </DialogTitle>
            <DialogDescription>
              {formMode === "add"
                ? `Add a new employment record for ${employeeName}`
                : `Update employment record for ${employeeName}`}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Department */}
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter department"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Employment Type */}
              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Type *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Full-time">Full-time</SelectItem>
                        <SelectItem value="Part-time">Part-time</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Date */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ""}
                        placeholder="Leave blank for current position"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {formMode === "add" ? "Add Record" : "Update Record"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
