"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Save, Trash } from "lucide-react";
import {
  type BankDetailsFormValues,
  deleteBankDetails,
  getEmployeeBankDetails,
  saveBankDetails,
} from "@/actions/hr/employee-bank";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  employeeId: z.number(),
  bankName: z.string().min(2, "Bank name is required"),
  accountName: z.string().min(2, "Account name is required"),
  accountNumber: z.string().min(5, "Valid account number is required"),
});

type EmployeeBankDetailsProps = {
  employeeId: number;
  employeeName: string;
};

export default function EmployeeBankDetails({
  employeeId,
  employeeName,
}: EmployeeBankDetailsProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: employeeId,
      bankName: "",
      accountName: "",
      accountNumber: "",
    },
  });

  const { data: bankDetails, isLoading } = useQuery({
    queryKey: ["employee-bank", employeeId],
    queryFn: () => getEmployeeBankDetails(employeeId),
  });

  useEffect(() => {
    if (bankDetails) {
      form.reset({
        employeeId: employeeId,
        bankName: bankDetails.bankName,
        accountName: bankDetails.accountName,
        accountNumber: bankDetails.accountNumber,
      });
    }
  }, [bankDetails, form, employeeId]);

  // Save bank details mutation
  const saveMutation = useMutation({
    mutationFn: (data: BankDetailsFormValues) => saveBankDetails(data),
    onSuccess: (result) => {
      if (result.success) {
        setSuccess(result.message);
        setError(null);
        queryClient.invalidateQueries({
          queryKey: ["employee-bank", employeeId],
        });
      } else {
        setError(result.message);
        setSuccess(null);
      }
    },
    onError: () => {
      setError("An error occurred while saving bank details");
      setSuccess(null);
    },
  });

  // Delete bank details mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteBankDetails(employeeId),
    onSuccess: (result) => {
      if (result.success) {
        setSuccess(result.message);
        setError(null);
        form.reset({
          employeeId: employeeId,
          bankName: "",
          accountName: "",
          accountNumber: "",
        });
        queryClient.invalidateQueries({
          queryKey: ["employee-bank", employeeId],
        });
      } else {
        setError(result.message);
        setSuccess(null);
      }
    },
    onError: () => {
      setError("An error occurred while deleting bank details");
      setSuccess(null);
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setError(null);
    setSuccess(null);
    saveMutation.mutate(data);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete these bank details?")) {
      setError(null);
      setSuccess(null);
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Bank Details</CardTitle>
        <CardDescription>
          Manage {employeeName}'s bank account information
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input
              type="hidden"
              {...form.register("employeeId", { valueAsNumber: true })}
            />

            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter bank name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter account holder name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter account number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={
                  !bankDetails ||
                  saveMutation.isPending ||
                  deleteMutation.isPending
                }
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>

              <Button
                type="submit"
                disabled={saveMutation.isPending || deleteMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
