/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const annualLeaveSettingsSchema = z.object({
  allocatedDays: z.number().min(1, "Allocated days must be at least 1"),
  year: z.number().min(2020, "Year must be valid"),
  description: z.string().optional(),
});

type AnnualLeaveSettingsFormValues = z.infer<typeof annualLeaveSettingsSchema>;

interface AnnualLeaveSettingsDialogProps {
  setting?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AnnualLeaveSettingsDialog({
  setting,
  onSuccess,
  onCancel,
}: AnnualLeaveSettingsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<AnnualLeaveSettingsFormValues>({
    resolver: zodResolver(annualLeaveSettingsSchema),
    defaultValues: {
      allocatedDays: setting?.allocatedDays || 30,
      year: setting?.year || new Date().getFullYear(),
      description: setting?.description || "",
    },
  });

  useEffect(() => {
    if (setting) {
      form.setValue("allocatedDays", setting.allocatedDays);
      form.setValue("year", setting.year);
      form.setValue("description", setting.description || "");
    }
  }, [setting, form]);

  const onSubmit = async (values: AnnualLeaveSettingsFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/hr/leaves/annual-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to set annual leave allocation");
        return;
      }

      toast.success("Annual leave allocation updated successfully");
      queryClient.invalidateQueries({ queryKey: ["annual-leave-settings"] });
      queryClient.invalidateQueries({ queryKey: ["annual-leave-balances"] });
      form.reset();
      onSuccess?.();
    } catch (_error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      Number(e.target.value) || new Date().getFullYear(),
                    )
                  }
                  min={2020}
                  max={2100}
                  disabled={!!setting}
                />
              </FormControl>
              <FormDescription>
                This allocation will apply to all employees for this year
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allocatedDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Annual Leave Days (All Employees) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                  min={1}
                  step={0.5}
                />
              </FormControl>
              <FormDescription>
                Number of annual leave days allocated to all employees for this
                year
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any notes about this allocation..."
                  {...field}
                  rows={3}
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {setting ? "Update" : "Set"} Allocation
          </Button>
        </div>
      </form>
    </Form>
  );
}
