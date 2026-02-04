import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export function MailLayoutSkeleton() {
  return (
    <div className="h-full w-full space-y-4">
      <div className="hidden md:grid md:h-full md:grid-cols-3">
        {/* Email List Sidebar */}
        <div className="flex h-full flex-col border-r col-span-1 bg-background">
          {/* Header */}
          <div className="p-4 border-b flex-shrink-0">
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>

          {/* Email List */}
          <ScrollArea className="h-screen">
            <div className="p-2 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Email Detail - Empty State */}
        <div className="flex h-full flex-col bg-background col-span-2">
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <Skeleton className="h-16 w-16 mb-4 opacity-20" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    </div>
  );
}
