"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import RegisterForm from "@/components/auth/register-form";
import { GalleryVerticalEnd } from "lucide-react";

const RegisterPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="flex flex-col items-center w-full max-w-md gap-6">
        <div className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          HJRBDA
        </div>
        <Card className="w-full">
          <CardContent className="flex flex-col gap-4 pt-6">
            <RegisterForm />
            <div className="text-center text-sm mt-4">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-primary underline hover:no-underline font-medium"
              >
                Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
