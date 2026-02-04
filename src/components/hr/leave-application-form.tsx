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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const leaveApplicationSchema = z.object({
  employeeId: z.number().min(1, "Employee is required"),
  leaveType: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

type LeaveApplicationFormValues = z.infer<typeof leaveApplicationSchema>;

interface LeaveApplicationFormProps {
  employeeId?: number;
  leaveToEdit?: {
    id: number;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function LeaveApplicationForm({
  employeeId: initialEmployeeId,
  leaveToEdit,
  onSuccess,
  onCancel,
}: LeaveApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee"],
    queryFn: async () => {
      const response = await fetch("/api/hr/employees/current");
      const data = await response.json();
      return data.employee;
    },
    enabled: !initialEmployeeId,
  });

  const form = useForm<LeaveApplicationFormValues>({
    resolver: zodResolver(leaveApplicationSchema),
    defaultValues: {
      employeeId: initialEmployeeId || currentEmployee?.id || undefined,
      leaveType: leaveToEdit?.leaveType || "",
      startDate: leaveToEdit?.startDate
        ? leaveToEdit.startDate.split("T")[0]
        : "",
      endDate: leaveToEdit?.endDate ? leaveToEdit.endDate.split("T")[0] : "",
      reason: leaveToEdit?.reason || "",
    },
  });

  // Update form when current employee is loaded
  useEffect(() => {
    if (
      currentEmployee &&
      !initialEmployeeId &&
      !form.getValues("employeeId")
    ) {
      form.setValue("employeeId", currentEmployee.id);
    }
  }, [currentEmployee, initialEmployeeId, form]);

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return 0;

    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  const onSubmit = async (values: LeaveApplicationFormValues) => {
    setIsSubmitting(true);
    try {
      const url = leaveToEdit
        ? `/api/hr/leaves/${leaveToEdit.id}`
        : "/api/hr/leaves";
      const method = leaveToEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(
          data.error ||
            `Failed to ${leaveToEdit ? "update" : "submit"} leave application`,
        );
        return;
      }

      toast.success(
        `Leave application ${leaveToEdit ? "updated" : "submitted"} successfully`,
      );
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      if (!leaveToEdit) {
        form.reset();
      }
      onSuccess?.();
    } catch (_error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show employee name if current employee is loaded
  const employeeName = currentEmployee?.name || "Loading...";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!initialEmployeeId && (
          <FormField
            control={form.control}
            name="employeeId"
            render={() => (
              <FormItem>
                <FormLabel>Employee</FormLabel>
                <FormControl>
                  <Input value={employeeName} disabled className="bg-muted" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="leaveType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leave Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Annual">Annual</SelectItem>
                  <SelectItem value="Sick">Sick</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Maternity">Maternity</SelectItem>
                  <SelectItem value="Paternity">Paternity</SelectItem>
                  <SelectItem value="Bereavement">Bereavement</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        field.value
                          ? new Date(`${field.value}T00:00:00`)
                          : undefined
                      }
                      onSelect={(date) => {
                        if (date) {
                          // Format as YYYY-MM-DD in local timezone
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(
                            2,
                            "0",
                          );
                          const day = String(date.getDate()).padStart(2, "0");
                          field.onChange(`${year}-${month}-${day}`);
                        }
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        field.value
                          ? new Date(`${field.value}T00:00:00`)
                          : undefined
                      }
                      onSelect={(date) => {
                        if (date) {
                          // Format as YYYY-MM-DD in local timezone
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(
                            2,
                            "0",
                          );
                          const day = String(date.getDate()).padStart(2, "0");
                          field.onChange(`${year}-${month}-${day}`);
                        }
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const start = startDate
                          ? new Date(`${startDate}T00:00:00`)
                          : null;
                        return date < today || (start ? date < start : false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {startDate && endDate && calculateDays() > 0 && (
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm font-medium">
              Total Working Days: {calculateDays()} days
            </p>
          </div>
        )}

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Please provide a reason for your leave application..."
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {leaveToEdit ? "Update Application" : "Submit Application"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
