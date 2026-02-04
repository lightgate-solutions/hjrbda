import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
