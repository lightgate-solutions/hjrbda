"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProjectTask, updateProjectTask } from "@/actions/project-tasks";
import { toast } from "sonner";
import { useTransition } from "react";

const projectTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(1000).optional(),
  assignedTo: z.string().min(1, "Assignee is required"),
  milestoneId: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  dueDate: z.string().optional(),
});

type ProjectTaskFormValues = z.infer<typeof projectTaskSchema>;

interface ProjectTaskFormProps {
  projectId: number;
  members: { id: number; name: string }[];
  milestones: { id: number; title: string }[];
  task?: any;
  onSuccess?: () => void;
}

export default function ProjectTaskForm({
  projectId,
  members,
  milestones,
  task,
  onSuccess,
}: ProjectTaskFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProjectTaskFormValues>({
    resolver: zodResolver(projectTaskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      assignedTo: task?.assignedTo ? String(task.assignedTo) : "",
      milestoneId: task?.milestoneId ? String(task.milestoneId) : "",
      priority: task?.priority || "Medium",
      dueDate: task?.dueDate
        ? new Date(task.dueDate).toISOString().slice(0, 10)
        : "",
    },
  });

  async function onSubmit(values: ProjectTaskFormValues) {
    startTransition(async () => {
      const payload = {
        ...values,
        projectId,
        assignedTo: Number(values.assignedTo),
        milestoneId: values.milestoneId ? Number(values.milestoneId) : null,
      };

      const result = task
        ? await updateProjectTask(task.id, payload as any)
        : await createProjectTask(payload as any);

      if (result.error) {
        toast.error(result.error.reason);
      } else {
        toast.success(task ? "Task updated" : "Task created");
        form.reset();
        onSuccess?.();
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="Task title" {...field} />
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
                <Textarea placeholder="Task description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="assignedTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign To *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={String(member.id)}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="milestoneId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Milestone (Optional)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Standalone task" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Standalone task</SelectItem>
                    {milestones.map((ms) => (
                      <SelectItem key={ms.id} value={String(ms.id)}>
                        {ms.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Saving..." : task ? "Update Task" : "Create Task"}
        </Button>
      </form>
    </Form>
  );
}
