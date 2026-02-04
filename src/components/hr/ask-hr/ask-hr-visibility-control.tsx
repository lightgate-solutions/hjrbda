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
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Eye,
  EyeOff,
  MessageCircle,
  MessageSquareOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { updateQuestionVisibility } from "@/actions/hr/ask-hr";

// Define the schema for form validation
const formSchema = z.object({
  isPublic: z.boolean(),
  allowPublicResponses: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface AskHrVisibilityControlProps {
  questionId: number;
  isPublic: boolean;
  allowPublicResponses: boolean;
  isHrAdmin: boolean;
  isOwner: boolean;
  trigger?: React.ReactNode;
}

export function AskHrVisibilityControl({
  questionId,
  isPublic,
  allowPublicResponses,
  isHrAdmin,
  isOwner,
  trigger,
}: AskHrVisibilityControlProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isPublic,
      allowPublicResponses,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  // Reset form when dialog opens
  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (open) {
      form.reset({
        isPublic,
        allowPublicResponses,
      });
    }
  };

  // Function to handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      const result = await updateQuestionVisibility(questionId, data);

      if (result.error) {
        toast.error(result.error.reason);
        return;
      }

      if (result.success) {
        toast.success(result.success.reason);

        // Close dialog
        setOpen(false);

        // Invalidate queries to refresh the question
        queryClient.invalidateQueries({
          queryKey: ["ask-hr-question", questionId],
        });
        queryClient.invalidateQueries({
          queryKey: ["ask-hr-questions"],
        });
      }
    } catch (error) {
      console.error("Error updating question visibility:", error);
      toast.error("Failed to update question visibility");
    }
  };

  // Don't render if user doesn't have permissions
  if (!isHrAdmin && !isOwner) {
    return null;
  }

  return (
    <>
      {/* Status indicators */}
      <div className="flex flex-wrap gap-2 items-center">
        <Badge
          variant={isPublic ? "default" : "outline"}
          className="flex items-center gap-1"
        >
          {isPublic ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
          {isPublic ? "Public" : "Private"}
        </Badge>

        {isPublic && (
          <Badge
            variant={allowPublicResponses ? "default" : "outline"}
            className="flex items-center gap-1"
          >
            {allowPublicResponses ? (
              <MessageCircle className="h-3 w-3" />
            ) : (
              <MessageSquareOff className="h-3 w-3" />
            )}
            {allowPublicResponses ? "Public Responses" : "HR Only Responses"}
          </Badge>
        )}

        {/* Edit button or custom trigger */}
        <Dialog open={open} onOpenChange={handleOpenChange}>
          {trigger ? (
            <DialogTrigger asChild>{trigger}</DialogTrigger>
          ) : (
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Change Visibility
              </Button>
            </DialogTrigger>
          )}

          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Question Visibility</DialogTitle>
              <DialogDescription>
                Control who can see and respond to this question.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
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
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 ml-6">
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
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
