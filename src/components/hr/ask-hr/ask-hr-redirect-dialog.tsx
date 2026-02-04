"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

import {
  redirectAskHrQuestion,
  getEmployeesForRedirection,
} from "@/actions/hr/ask-hr";
import { useQuery } from "@tanstack/react-query";

// Define the schema for form validation
const formSchema = z.object({
  employeeId: z.string().min(1, "Please select an employee"),
});

type FormData = z.infer<typeof formSchema>;

interface AskHrRedirectDialogProps {
  questionId: number;
  trigger: React.ReactNode;
}

export function AskHrRedirectDialog({
  questionId,
  trigger,
}: AskHrRedirectDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  // Fetch employees for redirection
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-redirection"],
    queryFn: getEmployeesForRedirection,
  });

  // Function to handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      const result = await redirectAskHrQuestion(questionId, {
        employeeId: Number(data.employeeId),
      });

      if (result.error) {
        toast.error(result.error.reason);
        return;
      }

      if (result.success) {
        toast.success(result.success.reason);

        // Reset form and close dialog
        form.reset();
        setOpen(false);

        // Invalidate queries to refresh the question and list
        queryClient.invalidateQueries({
          queryKey: ["ask-hr-question", questionId],
        });
        queryClient.invalidateQueries({
          queryKey: ["ask-hr-questions"],
        });
      }
    } catch (_error) {
      toast.error("Failed to redirect question. Please try again.");
    }
  };

  // Function to reset form when dialog closes
  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Redirect Question</DialogTitle>
          <DialogDescription>
            Redirect this question to another employee or department for
            response.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Redirect To</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem
                          key={employee.id}
                          value={employee.id.toString()}
                        >
                          {employee.name} - {employee.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Redirect Question
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
