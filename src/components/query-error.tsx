import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryErrorProps {
  error: Error | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export function QueryError({
  error,
  onRetry,
  title = "Failed to load data",
  description,
}: QueryErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="rounded-full bg-destructive/10 p-2.5 mb-3">
        <AlertCircle className="h-5 w-5 text-destructive" />
      </div>
      <h3 className="text-base font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
        {description || error?.message || "Please try again later."}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          Try again
        </Button>
      )}
    </div>
  );
}
