/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
// biome-ignore-all lint/style/noNonNullAssertion: <>

"use client";
import { useState } from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { createFolder } from "@/actions/documents/folders";
import { usePathname } from "next/navigation";

const uploadSchema = z.object({
  name: z
    .string()
    .min(3, "Folder name must be at least 3 characters.")
    .max(32, "Folder name must be at most 32 characters."),
  parent: z.string(),
  public: z.boolean(),
  departmental: z.boolean(),
});

export default function CreateFolderButton({
  usersFolders,
  department,
}: {
  usersFolders: { name: string }[];
  department: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pathname = usePathname();

  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      name: "",
      parent: "",
      public: false,
      departmental: false,
    },
  });

  async function onSubmit(data: z.infer<typeof uploadSchema>) {
    setIsSubmitting(true);
    try {
      const res = await createFolder(
        {
          name: data.name,
          parent: data.parent,
          public: data.public,
          departmental: data.departmental,
        },
        pathname,
      );
      if (res.success) {
        toast.success("Folder created succesfully");
      } else {
        toast.error(res.error?.reason);
      }
    } catch (_error) {
      toast.error("folder creation failed. Try again!");
    } finally {
      setIsSubmitting(false);
      form.reset();
    }
  }

  return (
    <form id="form-create-folder" onSubmit={form.handleSubmit(onSubmit)}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="hover:cursor-pointer w-full"
          size="lg"
        >
          Create Folder
        </Button>
      </DialogTrigger>
      <DialogContent className="lg:min-w-5xl max-h-[35rem] overflow-y-scroll ">
        <DialogHeader>
          <DialogTitle>Create Folder</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <div className="grid gap-4 grid-cols-2 py-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldContent>
                    <FieldLabel htmlFor="title">Folder Name *</FieldLabel>
                    <Input
                      {...field}
                      name="title"
                      aria-invalid={fieldState.invalid}
                      placeholder="Financial Report"
                      autoComplete="off"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                    <FieldDescription>Name of the folder</FieldDescription>
                  </FieldContent>
                </Field>
              )}
            />

            <Controller
              name="parent"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  orientation="responsive"
                  data-invalid={fieldState.invalid}
                >
                  <FieldContent>
                    <FieldLabel htmlFor="status">
                      Parent Folder (if any)
                    </FieldLabel>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        name="status"
                        aria-invalid={fieldState.invalid}
                        className="w-full"
                      >
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent position="item-aligned">
                        {usersFolders.map((folder, idx) => (
                          <SelectItem key={idx} value={folder.name}>
                            {folder.name.charAt(0).toUpperCase() +
                              folder.name.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Select parent folder for nested folders
                    </FieldDescription>
                  </FieldContent>
                </Field>
              )}
            />

            <div>
              <FieldContent>
                <FieldLabel>Options</FieldLabel>

                <Controller
                  name="public"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <FieldSet data-invalid={fieldState.invalid}>
                      <FieldGroup data-slot="checkbox-group">
                        <Field orientation="horizontal">
                          <Checkbox
                            name={field.name}
                            onCheckedChange={field.onChange}
                          />
                          <FieldLabel htmlFor="public" className="font-normal">
                            Public (Folders are only public when their parent
                            folder is set to public)
                          </FieldLabel>
                        </Field>
                      </FieldGroup>

                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </FieldSet>
                  )}
                />

                <Controller
                  name="departmental"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <FieldSet data-invalid={fieldState.invalid}>
                      <FieldGroup data-slot="checkbox-group">
                        <Field orientation="horizontal">
                          <Checkbox
                            name={field.name}
                            onCheckedChange={field.onChange}
                          />
                          <FieldLabel htmlFor="public" className="font-normal">
                            Department (Folder accessible to {department}{" "}
                            employees)
                          </FieldLabel>
                        </Field>
                      </FieldGroup>

                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </FieldSet>
                  )}
                />

                <FieldDescription>
                  Select options that apply to upload
                </FieldDescription>
              </FieldContent>
            </div>
          </div>
        </FieldGroup>

        <div>
          <Field orientation="horizontal">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
              }}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              form="form-create-folder"
              className="hover:cursor-pointer"
            >
              {isSubmitting && <Spinner />}
              {!isSubmitting ? "Create" : "Creating..."}
            </Button>
          </Field>
        </div>
      </DialogContent>
    </form>
  );
}
