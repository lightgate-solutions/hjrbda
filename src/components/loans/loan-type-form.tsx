/** biome-ignore-all lint/style/noNonNullAssertion: <> */

"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  createLoanType,
  updateLoanType,
  getLoanTypeById,
  getAllSalaryStructures,
} from "@/actions/loans/loans";

const loanTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  amountType: z.enum(["fixed", "percentage"]),
  fixedAmount: z.string().optional(),
  maxPercentage: z.string().optional(),
  tenureMonths: z
    .string()
    .min(1, "Tenure is required")
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) >= 1, {
      message: "Tenure must be at least 1 month",
    }),
  interestRate: z.string().optional(),
  minServiceMonths: z.string().optional(),
  maxActiveLoans: z.string().optional(),
  salaryStructureIds: z
    .array(z.number())
    .min(1, "Select at least one salary structure"),
  isActive: z.boolean().optional(),
});

type LoanTypeFormValues = z.infer<typeof loanTypeSchema>;

interface LoanTypeFormProps {
  employeeId?: number; // Kept for backward compatibility, no longer used
  loanTypeId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function LoanTypeForm({
  loanTypeId,
  onSuccess,
  onCancel,
}: LoanTypeFormProps) {
  const isEditing = !!loanTypeId;

  const form = useForm<LoanTypeFormValues>({
    resolver: zodResolver(loanTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      amountType: "fixed",
      fixedAmount: "",
      maxPercentage: "",
      tenureMonths: "12",
      interestRate: "0",
      minServiceMonths: "0",
      maxActiveLoans: "1",
      salaryStructureIds: [],
      isActive: true,
    },
  });

  // Get salary structures
  const { data: structures, isLoading: loadingStructures } = useQuery({
    queryKey: ["salary-structures"],
    queryFn: getAllSalaryStructures,
  });

  // Get existing loan type if editing
  const { data: existingType } = useQuery({
    queryKey: ["loan-type", loanTypeId],
    queryFn: () => getLoanTypeById(loanTypeId!),
    enabled: isEditing,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingType) {
      form.reset({
        name: existingType.name,
        description: existingType.description || "",
        amountType: existingType.amountType,
        fixedAmount: existingType.fixedAmount || "",
        maxPercentage: existingType.maxPercentage || "",
        tenureMonths: String(existingType.tenureMonths),
        interestRate: existingType.interestRate || "0",
        minServiceMonths: existingType.minServiceMonths
          ? String(existingType.minServiceMonths)
          : "",
        maxActiveLoans: existingType.maxActiveLoans
          ? String(existingType.maxActiveLoans)
          : "",
        salaryStructureIds:
          existingType.salaryStructures?.map((s) => s.id) || [],
        isActive: existingType.isActive,
      });
    }
  }, [existingType, form]);

  const createMutation = useMutation({
    mutationFn: createLoanType,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        form.reset();
        onSuccess?.();
      } else {
        toast.error(result.error?.reason || "Failed to create loan type");
      }
    },
    onError: () => {
      toast.error("An error occurred. Please try again.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateLoanType>[1]) =>
      updateLoanType(loanTypeId!, data),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        onSuccess?.();
      } else {
        toast.error(result.error?.reason || "Failed to update loan type");
      }
    },
    onError: () => {
      toast.error("An error occurred. Please try again.");
    },
  });

  const onSubmit = (values: LoanTypeFormValues) => {
    const submitData = {
      ...values,
      tenureMonths: Number(values.tenureMonths),
      minServiceMonths: values.minServiceMonths
        ? Number(values.minServiceMonths)
        : undefined,
      maxActiveLoans: values.maxActiveLoans
        ? Number(values.maxActiveLoans)
        : undefined,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const amountType = form.watch("amountType");
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Emergency Loan" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of the loan type..."
                  className="resize-none"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="percentage">
                      Percentage of Salary
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {amountType === "fixed" ? (
            <FormField
              control={form.control}
              name="fixedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fixed Amount (NGN)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="50000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="maxPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Percentage (%)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="300" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tenureMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tenure (Months) *</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxActiveLoans"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Active Loans</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="salaryStructureIds"
          render={() => (
            <FormItem>
              <FormLabel>Eligible Salary Structures *</FormLabel>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {loadingStructures ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : (
                  structures?.map((structure) => (
                    <FormField
                      key={structure.id}
                      control={form.control}
                      name="salaryStructureIds"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(structure.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, structure.id]);
                                } else {
                                  field.onChange(
                                    current.filter((id) => id !== structure.id),
                                  );
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {structure.name}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {isEditing && (
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal">Active</FormLabel>
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Create"} Loan Type
          </Button>
        </div>
      </form>
    </Form>
  );
}
