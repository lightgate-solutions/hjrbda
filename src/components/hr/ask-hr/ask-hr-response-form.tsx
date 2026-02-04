"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { respondToAskHrQuestion } from "@/actions/hr/ask-hr";

// Define the schema for form validation
const formSchema = z.object({
  response: z.string().min(2, "Response must be at least 2 characters"),
  isInternal: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface AskHrResponseFormProps {
  questionId: number;
  isHrAdmin: boolean;
  onResponseSubmitted?: () => void;
}

export function AskHrResponseForm({
  questionId,
  isHrAdmin,
  onResponseSubmitted,
}: AskHrResponseFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      response: "",
      isInternal: false,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  // Function to handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      const result = await respondToAskHrQuestion(questionId, data);

      if (result.error) {
        toast.error(result.error.reason);
        return;
      }

      if (result.success) {
        toast.success(result.success.reason);

        // Reset form
        form.reset();

        // Invalidate queries to refresh the question and responses
        queryClient.invalidateQueries({
          queryKey: ["ask-hr-question", questionId],
        });

        // Invalidate the questions list as well
        queryClient.invalidateQueries({
          queryKey: ["ask-hr-questions"],
        });

        // Call the callback if provided
        onResponseSubmitted?.();
      }
    } catch (_error) {
      toast.error("Failed to submit response. Please try again.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="response"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Response *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Type your response here..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isHrAdmin && (
          <FormField
            control={form.control}
            name="isInternal"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Internal Note</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Only visible to HR and admin users
                  </p>
                </div>
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Response
          </Button>
        </div>
      </form>
    </Form>
  );
}
