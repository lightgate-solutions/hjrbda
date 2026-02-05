"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-4 text-center">
      <div className="flex flex-col items-center gap-6">
        <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
          <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h2>
          <p className="text-muted-foreground max-w-md text-sm">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => reset()} variant="default">
            Try again
          </Button>
          <Button
            onClick={() => {
              window.location.href = "/";
            }}
            variant="outline"
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
