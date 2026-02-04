"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadMoreButtonProps {
  onClick: () => void;
  loading: boolean;
  hasMore: boolean;
  className?: string;
}

export function LoadMoreButton({
  onClick,
  loading,
  hasMore,
  className,
}: LoadMoreButtonProps) {
  if (!hasMore) {
    return (
      <div className={cn("py-4 text-center", className)}>
        <p className="text-sm text-muted-foreground">
          You've reached the end of the list
        </p>
      </div>
    );
  }

  return (
    <div className={cn("py-4 text-center", className)}>
      <Button
        onClick={onClick}
        disabled={loading}
        variant="outline"
        size="sm"
        className="min-w-[120px]"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          "Load More"
        )}
      </Button>
    </div>
  );
}
