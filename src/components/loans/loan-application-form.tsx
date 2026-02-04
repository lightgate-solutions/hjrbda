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
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  getEligibleLoanTypes,
  calculateMaxEligibleAmount,
  applyForLoan,
} from "@/actions/loans/loans";

const loanApplicationSchema = z.object({
  loanTypeId: z.number().min(1, "Loan type is required"),
  requestedAmount: z.string().min(1, "Amount is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

type LoanApplicationFormValues = z.infer<typeof loanApplicationSchema>;

interface LoanApplicationFormProps {
  employeeId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function LoanApplicationForm({
  employeeId,
  onSuccess,
  onCancel,
}: LoanApplicationFormProps) {
  const [selectedLoanType, setSelectedLoanType] = useState<number | null>(null);
  const [requestedAmount, setRequestedAmount] = useState<string>("");

  const form = useForm<LoanApplicationFormValues>({
    resolver: zodResolver(loanApplicationSchema),
    defaultValues: {
      loanTypeId: 0,
      requestedAmount: "",
      reason: "",
    },
  });

  // Get eligible loan types
  const { data: eligibleData, isLoading: loadingTypes } = useQuery({
    queryKey: ["eligible-loan-types", employeeId],
    queryFn: () => getEligibleLoanTypes(employeeId!),
    enabled: !!employeeId,
  });

  // Calculate max eligible amount when loan type is selected
  const { data: eligibilityData, isLoading: _loadingEligibility } = useQuery({
    queryKey: ["loan-eligibility", employeeId, selectedLoanType],
    queryFn: () => calculateMaxEligibleAmount(employeeId!, selectedLoanType!),
    enabled: !!employeeId && !!selectedLoanType,
  });

  // Calculate loan details based on requested amount
  const calculateLoanDetails = (amount: number) => {
    if (!amount || !eligibilityData || amount <= 0) return null;

    const interestRate = eligibilityData.interestRate || 0;
    const tenure = eligibilityData.tenure || 12;
    const totalInterest = (amount * interestRate * tenure) / (12 * 100);
    const totalRepayment = amount + totalInterest;
    const monthlyRepayment = totalRepayment / tenure;

    return {
      totalInterest,
      totalRepayment,
      monthlyRepayment,
    };
  };

  const calculatedDetails = calculateLoanDetails(Number(requestedAmount) || 0);

  const applyMutation = useMutation({
    mutationFn: applyForLoan,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        form.reset();
        onSuccess?.();
      } else {
        toast.error(result.error?.reason || "Failed to submit application");
      }
    },
    onError: () => {
      toast.error("An error occurred. Please try again.");
    },
  });

  const onSubmit = (values: LoanApplicationFormValues) => {
    applyMutation.mutate(values);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  if (!employeeId) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Employee information not available
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="loanTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Loan Type *</FormLabel>
              <Select
                onValueChange={(value) => {
                  const typeId = Number(value);
                  field.onChange(typeId);
                  setSelectedLoanType(typeId);
                }}
                value={field.value ? field.value.toString() : ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select loan type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {loadingTypes ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : eligibleData?.loanTypes?.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No eligible loan types
                    </SelectItem>
                  ) : (
                    eligibleData?.loanTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedLoanType && eligibilityData && !eligibilityData.error && (
          <div className="rounded-md bg-muted p-4 space-y-2">
            <h4 className="font-medium">Loan Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Maximum Amount</p>
                <p className="font-medium">
                  {formatCurrency(eligibilityData.maxAmount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Repayment</p>
                <p className="font-medium">
                  {formatCurrency(calculatedDetails?.totalRepayment || 0)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Monthly Repayment</p>
                <p className="font-medium">
                  {formatCurrency(calculatedDetails?.monthlyRepayment || 0)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Tenure</p>
                <p className="font-medium">{eligibilityData.tenure} months</p>
              </div>
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="requestedAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requested Amount (NGN) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    setRequestedAmount(e.target.value);
                  }}
                  max={eligibilityData?.maxAmount || undefined}
                />
              </FormControl>
              {eligibilityData?.maxAmount && (
                <FormDescription>
                  Maximum: {formatCurrency(eligibilityData.maxAmount)}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Loan *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Please explain why you need this loan..."
                  className="resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={applyMutation.isPending}>
            {applyMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Submit Application
          </Button>
        </div>
      </form>
    </Form>
  );
}
