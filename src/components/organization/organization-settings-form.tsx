"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateOrganization,
  uploadOrganizationLogo,
} from "@/actions/organization";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import Image from "next/image";
import { Spinner } from "@/components/ui/spinner";

const organizationFormSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

interface OrganizationSettingsFormProps {
  organization: {
    id: number;
    name: string;
    logoUrl: string | null;
    logoKey: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

export default function OrganizationSettingsForm({
  organization,
}: OrganizationSettingsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    organization?.logoUrl || null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: organization?.name || "",
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
      "image/webp",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error(
        "Please select a valid image file (PNG, JPG, JPEG, SVG, or WEBP)",
      );
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
  };

  const handleLogoUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a logo to upload");
      return;
    }

    setIsUploadingLogo(true);

    try {
      // Get presigned URL
      const presignedResponse = await fetch("/api/r2/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
          size: selectedFile.size,
        }),
      });

      if (!presignedResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { presignedUrl, key, publicUrl } = await presignedResponse.json();

      // Upload file to R2
      const uploadResponse = await fetch(presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload logo");
      }

      // Update organization with new logo
      const result = await uploadOrganizationLogo(publicUrl, key);

      if (result.error) {
        toast.error(result.error.reason);
        return;
      }

      toast.success("Logo uploaded successfully");
      setSelectedFile(null);
      router.refresh();
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setSelectedFile(null);
  };

  const onSubmit = async (data: OrganizationFormValues) => {
    setIsSubmitting(true);

    try {
      const result = await updateOrganization({
        name: data.name,
        logoUrl: organization?.logoUrl,
        logoKey: organization?.logoKey,
      });

      if (result.error) {
        toast.error(result.error.reason);
        return;
      }

      toast.success("Organization settings updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Error updating organization:", error);
      toast.error("Failed to update organization settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Logo Upload Section */}
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Organization Logo</h2>
        <div className="space-y-4">
          {logoPreview && (
            <div className="relative w-48 h-48 border rounded-lg overflow-hidden bg-muted">
              <Image
                src={logoPreview}
                alt="Organization logo"
                fill
                className="object-contain p-4"
              />
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Label
              htmlFor="logo-upload"
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent"
            >
              <Upload className="h-4 w-4" />
              {logoPreview ? "Change Logo" : "Upload Logo"}
            </Label>
            <input
              id="logo-upload"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile && (
              <Button
                type="button"
                onClick={handleLogoUpload}
                disabled={isUploadingLogo}
              >
                {isUploadingLogo ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Uploading...
                  </>
                ) : (
                  "Save Logo"
                )}
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Upload your organization logo. Accepted formats: PNG, JPG, JPEG,
            SVG, WEBP. Max size: 5MB.
          </p>
        </div>
      </div>

      {/* Organization Name Section */}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-lg border p-6"
      >
        <h2 className="text-xl font-semibold mb-4">Organization Information</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Enter organization name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
