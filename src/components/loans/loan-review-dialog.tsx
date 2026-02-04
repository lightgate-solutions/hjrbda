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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { hrReviewLoan } from "@/actions/loans/loans";
import { Badge } from "@/components/ui/badge";

const reviewSchema = z.object({
  approvedAmount: z.string().optional(),
  remarks: z.string().optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface LoanReviewDialogProps {
  loan: {
    id: number;
    referenceNumber: string;
    employeeName: string | null;
    employeeDepartment: string | null;
    loanTypeName: string | null;
    requestedAmount: string;
    tenureMonths: number;
    reason: string;
    salaryInfo?: {
      structureName: string;
      baseSalary: string;
    } | null;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function LoanReviewDialog({
  loan,
  onSuccess,
  onCancel,
}: LoanReviewDialogProps) {
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      approvedAmount: loan.requestedAmount,
      remarks: "",
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (data: {
      action: "approve" | "reject";
      approvedAmount?: string;
      remarks?: string;
    }) =>
      hrReviewLoan({
        applicationId: loan.id,
        action: data.action,
        approvedAmount: data.approvedAmount,
        remarks: data.remarks,
      }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success.reason);
        onSuccess?.();
      } else {
        toast.error(result.error?.reason || "Failed to review loan");
      }
    },
    onError: () => {
      toast.error("An error occurred. Please try again.");
    },
  });

  const handleApprove = () => {
    const values = form.getValues();
    reviewMutation.mutate({
      action: "approve",
      approvedAmount: values.approvedAmount,
      remarks: values.remarks,
    });
  };

  const handleReject = () => {
    const values = form.getValues();
    if (!values.remarks) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    reviewMutation.mutate({
      action: "reject",
      remarks: values.remarks,
    });
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "NGN",
    }).format(Number(amount));
  };

  return (
    <div className="space-y-4">
      {/* Loan Summary */}
      <div className="rounded-md bg-muted p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Application Details</h4>
          <Badge variant="outline">{loan.referenceNumber}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Employee</p>
            <p className="font-medium">{loan.employeeName}</p>
            <p className="text-xs text-muted-foreground">
              {loan.employeeDepartment}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Loan Type</p>
            <p className="font-medium">{loan.loanTypeName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Requested Amount</p>
            <p className="font-medium">
              {formatCurrency(loan.requestedAmount)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Tenure</p>
            <p className="font-medium">{loan.tenureMonths} months</p>
          </div>
          {loan.salaryInfo && (
            <>
              <div>
                <p className="text-muted-foreground">Salary Structure</p>
                <p className="font-medium">{loan.salaryInfo.structureName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Base Salary</p>
                <p className="font-medium">
                  {formatCurrency(loan.salaryInfo.baseSalary)}
                </p>
              </div>
            </>
          )}
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Reason</p>
          <p className="text-sm mt-1">{loan.reason}</p>
        </div>
      </div>

      {/* Review Form */}
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="approvedAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Approved Amount (NGN)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Enter amount" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="remarks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remarks</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add any remarks or reason for rejection..."
                    className="resize-none"
                    rows={3}
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
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Reject
            </Button>
            <Button
              type="button"
              onClick={handleApprove}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
