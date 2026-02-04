import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AskHrQuestionDetail } from "@/components/hr/ask-hr/ask-hr-question-detail";
import { notFound } from "next/navigation";

// Skeleton loader for the question detail
function QuestionDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-[200px] w-full rounded-md" />
      <Skeleton className="h-12 w-32" />
      <Skeleton className="h-[150px] w-full rounded-md" />
      <Skeleton className="h-[150px] w-full rounded-md" />
    </div>
  );
}

// Generate metadata dynamically
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  return {
    title: `Question #${params.id} - Ask HR - HJRBDA`,
    description: "View and respond to HR question",
  };
}

export default function QuestionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Parse and validate the ID parameter
  const questionId = Number(params.id);

  if (Number.isNaN(questionId) || questionId <= 0) {
    notFound();
  }

  return (
    <div className="container mx-auto py-4">
      <Suspense fallback={<QuestionDetailSkeleton />}>
        <AskHrQuestionDetail questionId={questionId} />
      </Suspense>
    </div>
  );
}
