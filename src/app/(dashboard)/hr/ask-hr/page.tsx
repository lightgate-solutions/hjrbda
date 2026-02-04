import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import AskHrTable from "@/components/hr/ask-hr/ask-hr-table";

export const metadata: Metadata = {
  title: "Ask HR - HJRBDA",
  description: "Submit and view HR questions",
};

// Skeleton loader for the table
function AskHrTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-[600px] w-full rounded-md" />
    </div>
  );
}

export default function AskHrPage() {
  return (
    <div className="container mx-auto py-4">
      <Suspense fallback={<AskHrTableSkeleton />}>
        <AskHrTable />
      </Suspense>
    </div>
  );
}
