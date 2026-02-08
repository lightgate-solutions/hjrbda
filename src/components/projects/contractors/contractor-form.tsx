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
import { createContractor, updateContractor } from "@/actions/contractors";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

const contractorSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(20).nullable().optional().or(z.literal("")),
  address: z.string().max(500).nullable().optional().or(z.literal("")),
  specialization: z.string().max(255).nullable().optional().or(z.literal("")),
});

type ContractorFormValues = z.infer<typeof contractorSchema>;

export type ContractorRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  specialization: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

interface ContractorFormProps {
  contractor?: ContractorRow | null;
  onSuccess?: () => void;
}

export default function ContractorForm({
  contractor,
  onSuccess,
}: ContractorFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ContractorFormValues>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      name: contractor?.name || "",
      email: contractor?.email || "",
      phone: contractor?.phone || "",
      address: contractor?.address || "",
      specialization: contractor?.specialization || "",
    },
  });

  async function onSubmit(values: ContractorFormValues) {
    startTransition(async () => {
      const result = contractor
        ? await updateContractor(contractor.id, values)
        : await createContractor(values);

      if (result.error) {
        toast.error(result.error.reason);
      } else {
        toast.success(contractor ? "Contractor updated" : "Contractor created");
        form.reset();
        onSuccess?.();
        router.refresh();
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Contractor/Vendor Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="email@example.com"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+1234567890"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="specialization"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specialization</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Civil Engineering, Electrical"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Contractor physical address"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending
            ? "Saving..."
            : contractor
              ? "Update Contractor"
              : "Add Contractor"}
        </Button>
      </form>
    </Form>
  );
}
