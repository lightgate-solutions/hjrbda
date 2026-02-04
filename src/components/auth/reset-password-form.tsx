"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { LoadingSwap } from "../ui/loading-swap";
import { WdsPasswordInput } from "../ui/password-input";
import PasswordInput from "./password-input";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords does not match",
  });

type ResetPasswordFormType = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  const form = useForm<ResetPasswordFormType>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });
  const { isSubmitting } = form.formState;

  async function onSubmit(data: ResetPasswordFormType) {
    if (token == null) return;

    await authClient.resetPassword(
      {
        newPassword: data.password,
        token: token,
      },
      {
        onError: (err) => {
          form.reset();
          toast.error(err.error.message || "Failed to reset password");
        },
        onSuccess: () => {
          form.reset();
          toast.success("Password reset successful", {
            description: "Redirecting to login...",
          });
          setTimeout(() => {
            router.push("/auth/login");
          }, 1000);
        },
      },
    );
  }

  if (token == null || error != null) {
    return (
      <div className="my-6 px-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>
              The password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href="/auth/login">Back to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>Enter new password</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          id="reset-password-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FieldGroup>
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="reset-password">Password *</FieldLabel>
                  <PasswordInput
                    {...field}
                    onChangeAction={field.onChange}
                    id="reset-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="reset-confirm-password">
                    Confirm Password *
                  </FieldLabel>
                  <WdsPasswordInput
                    {...field}
                    placeholder="Confirm Password"
                    id="reset-confirm-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col space-y-4">
        <Button
          type="submit"
          form="reset-password-form"
          className="w-full hover:cursor-pointer"
          disabled={isSubmitting}
        >
          <LoadingSwap isLoading={isSubmitting}>Reset Password</LoadingSwap>
        </Button>
      </CardFooter>
    </Card>
  );
}
