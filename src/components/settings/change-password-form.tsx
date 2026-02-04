"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { FormError, FormSuccess } from "../ui/form-messages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { changePassword } from "@/actions/settings/settings";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "Current password is required" }),
    newPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z
      .string()
      .min(1, { message: "Please confirm your password" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const [isCurrentVisible, setIsCurrentVisible] = useState(false);
  const [isNewVisible, setIsNewVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [formState, setFormState] = useState<{
    success?: string;
    error?: string;
  }>({});

  const currentId = useId();
  const newId = useId();
  const confirmId = useId();

  const toggleCurrentVisibility = () => setIsCurrentVisible((prev) => !prev);
  const toggleNewVisibility = () => setIsNewVisible((prev) => !prev);
  const toggleConfirmVisibility = () => setIsConfirmVisible((prev) => !prev);

  const onSubmit = async (data: FormData) => {
    setFormState({});

    const res = await changePassword(data.currentPassword, data.newPassword);

    if (res.error) {
      setFormState({ error: res.error.reason || "Failed to change password" });
    } else {
      setFormState({ success: "Password changed successfully" });
      toast.success(res.success.reason);
      reset();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Update your password to keep your account secure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <FormSuccess message={formState.success || ""} />
          <FormError message={formState.error || ""} />

          <div className="flex flex-col gap-2">
            <Label htmlFor={currentId}>Current Password *</Label>
            <div className="relative">
              <Input
                id={currentId}
                type={isCurrentVisible ? "text" : "password"}
                placeholder="Enter current password"
                autoComplete="current-password"
                className="pe-9"
                {...register("currentPassword")}
              />
              <button
                className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={toggleCurrentVisibility}
                aria-label={
                  isCurrentVisible ? "Hide password" : "Show password"
                }
                aria-pressed={isCurrentVisible}
              >
                {isCurrentVisible ? (
                  <EyeOffIcon size={16} aria-hidden="true" />
                ) : (
                  <EyeIcon size={16} aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <span className="text-xs text-red-500">
                {errors.currentPassword.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={newId}>New Password *</Label>
            <div className="relative">
              <Input
                id={newId}
                type={isNewVisible ? "text" : "password"}
                placeholder="Enter new password"
                autoComplete="new-password"
                className="pe-9"
                {...register("newPassword")}
              />
              <button
                className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={toggleNewVisibility}
                aria-label={isNewVisible ? "Hide password" : "Show password"}
                aria-pressed={isNewVisible}
              >
                {isNewVisible ? (
                  <EyeOffIcon size={16} aria-hidden="true" />
                ) : (
                  <EyeIcon size={16} aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <span className="text-xs text-red-500">
                {errors.newPassword.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={confirmId}>Confirm New Password *</Label>
            <div className="relative">
              <Input
                id={confirmId}
                type={isConfirmVisible ? "text" : "password"}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="pe-9"
                {...register("confirmPassword")}
              />
              <button
                className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={toggleConfirmVisibility}
                aria-label={
                  isConfirmVisible ? "Hide password" : "Show password"
                }
                aria-pressed={isConfirmVisible}
              >
                {isConfirmVisible ? (
                  <EyeOffIcon size={16} aria-hidden="true" />
                ) : (
                  <EyeIcon size={16} aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="text-xs text-red-500">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          <Button type="submit" className="mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Changing Password..." : "Change Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
