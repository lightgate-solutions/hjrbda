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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

import { submitAskHrQuestion } from "@/actions/hr/ask-hr";

// Define the schema for form validation
const formSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(100, "Title must not exceed 100 characters"),
  question: z.string().min(10, "Question must be at least 10 characters"),
  isAnonymous: z.boolean(),
  isPublic: z.boolean(),
  allowPublicResponses: z.boolean(),
  category: z.enum([
    "General",
    "Benefits",
    "Payroll",
    "Leave",
    "Employment",
    "Workplace",
    "Training",
    "Other",
  ]),
});

type FormData = z.infer<typeof formSchema>;

interface AskHrFormProps {
  trigger: React.ReactNode;
}

export function AskHrForm({ trigger }: AskHrFormProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      question: "",
      isAnonymous: false,
      isPublic: false,
      allowPublicResponses: false,
      category: "General",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  // Function to handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      const result = await submitAskHrQuestion(data);

      if (result.error) {
        toast.error(result.error.reason);
        return;
      }

      if (result.success) {
        toast.success(result.success.reason);

        // Reset form and close dialog
        form.reset();
        setOpen(false);

        // Invalidate queries to refresh question lists
        queryClient.invalidateQueries({ queryKey: ["ask-hr-questions"] });
      }
    } catch (_error) {
      toast.error("Failed to submit question. Please try again.");
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
      <DialogContent className="sm:max-w-[550px] max-h-11/12 overflow-auto">
        <DialogHeader>
          <DialogTitle>Ask HR a Question</DialogTitle>
          <DialogDescription>
            Submit your question to the HR department. Fill out the form below
            with details about your inquiry.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief title for your question"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Benefits">Benefits</SelectItem>
                      <SelectItem value="Payroll">Payroll</SelectItem>
                      <SelectItem value="Leave">Leave</SelectItem>
                      <SelectItem value="Employment">Employment</SelectItem>
                      <SelectItem value="Workplace">Workplace</SelectItem>
                      <SelectItem value="Training">Training</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Question *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your question or concern in detail..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isAnonymous"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Submit Anonymously</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Your name will not be visible to HR department
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        // If not public, disable public responses
                        if (!checked) {
                          form.setValue("allowPublicResponses", false);
                        }
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Make Question Public</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Question will be visible to all employees
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("isPublic") && (
              <FormField
                control={form.control}
                name="allowPublicResponses"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 ml-8">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Allow Public Responses</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Other employees can respond to this question
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

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
                Submit Question
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
