/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { AskHrResponseForm } from "./ask-hr-response-form";
import { AskHrRedirectDialog } from "./ask-hr-redirect-dialog";
import { AskHrVisibilityControl } from "./ask-hr-visibility-control";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Clock,
  Forward,
  Loader2,
  Play,
  User,
  XCircle,
} from "lucide-react";

import {
  getAskHrQuestion,
  updateAskHrQuestionStatus,
} from "@/actions/hr/ask-hr";
import { getUser } from "@/actions/auth/dal";

interface AskHrQuestionDetailProps {
  questionId: number;
}

export function AskHrQuestionDetail({ questionId }: AskHrQuestionDetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch current user information
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => getUser(),
  });

  // Fetch question details
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["ask-hr-question", questionId],
    queryFn: () => getAskHrQuestion(questionId),
  });

  const question = data?.question;
  const responses = data?.responses || [];
  const canRespond = data?.canRespond || false;
  const canRedirect = data?.canRedirect || false;
  const isOwner = currentUser && question?.authorId === currentUser.id;

  // Status update handler
  const handleStatusUpdate = async (status: string) => {
    try {
      const result = await updateAskHrQuestionStatus(
        questionId,
        status as "Open" | "In Progress" | "Answered" | "Closed",
      );

      if (result.error) {
        toast.error(result.error.reason);
        return;
      }

      if (result.success) {
        toast.success(result.success.reason);

        // Refetch data
        refetch();

        // Also update the questions list
        queryClient.invalidateQueries({
          queryKey: ["ask-hr-questions"],
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status. Please try again.");
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "default";
      case "In Prgress":
        return "default";
      case "Redirected":
        return "outline";
      case "Answered":
        return "secondary";
      case "Closed":
        return "default";
      default:
        return "default";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Open":
        return <CircleDashed className="h-4 w-4" />;
      case "In Progress":
        return <Play className="h-4 w-4" />;
      case "Redirected":
        return <Forward className="h-4 w-4" />;
      case "Answered":
        return <CheckCircle2 className="h-4 w-4" />;
      case "Closed":
        return <XCircle className="h-4 w-4" />;
      default:
        return <CircleDashed className="h-4 w-4" />;
    }
  };

  // Helper to get avatar fallback text
  const getAvatarFallback = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/hr/ask-hr")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Skeleton className="h-6 w-32 ml-auto" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-3/4 mb-2" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-5 w-32" />
          </CardFooter>
        </Card>

        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={`skeleton-response-${i}`}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error handling
  if (data?.error || !question) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/hr/ask-hr")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Questions
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{data?.error || "Question not found"}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push("/hr/ask-hr")}>
              Return to Questions
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with navigation and actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/hr/ask-hr")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Questions
        </Button>

        {canRedirect && question.status !== "Closed" && (
          <div className="flex flex-wrap gap-2">
            {/* Status update buttons */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge
                variant={getStatusColor(question.status)}
                className="flex items-center gap-1"
              >
                {getStatusIcon(question.status)} {question.status}
              </Badge>
            </div>

            {question.status === "Open" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate("In Progress")}
              >
                <Play className="h-4 w-4 mr-1" /> Mark as In Progress
              </Button>
            )}

            {(question.status === "Open" ||
              question.status === "In Progress" ||
              question.status === "Redirected") && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <XCircle className="h-4 w-4 mr-1" /> Close Question
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close Question</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to close this question? This will
                      mark it as resolved and further responses will not be
                      accepted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleStatusUpdate("Closed")}
                    >
                      Close Question
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {(question.status === "Open" ||
              question.status === "In Progress") && (
              <AskHrRedirectDialog
                questionId={questionId}
                trigger={
                  <Button size="sm" variant="outline">
                    <Forward className="h-4 w-4 mr-1" /> Redirect
                  </Button>
                }
              />
            )}

            {isRefetching && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Question card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{question.title}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="outline">{question.category}</Badge>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />{" "}
                  {format(new Date(question.createdAt), "MMM d, yyyy")}
                </span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap">
          {question.question}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex items-center gap-2">
            {question.isAnonymous ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>AN</AvatarFallback>
                </Avatar>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> Anonymous
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>
                    {getAvatarFallback(question.authorName ?? "---")}
                  </AvatarFallback>
                </Avatar>
                <span>{question.authorName}</span>
                <Badge variant="outline" className="text-xs">
                  {question.authorDepartment}
                </Badge>
              </div>
            )}
          </div>
          <div>
            <Badge
              variant={getStatusColor(question.status)}
              className="flex items-center gap-1"
            >
              {getStatusIcon(question.status)} {question.status}
            </Badge>
          </div>
        </CardFooter>
      </Card>

      {/* Visibility controls */}
      <div className="mt-4">
        <AskHrVisibilityControl
          questionId={questionId}
          isPublic={question.isPublic}
          allowPublicResponses={question.allowPublicResponses}
          isHrAdmin={canRedirect}
          isOwner={isOwner ?? false}
        />
      </div>

      {/* Redirected info */}
      {question.redirectedTo && (
        <Card className="border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1 text-orange-700 dark:text-orange-400">
              <Forward className="h-4 w-4" /> Redirected
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-orange-700 dark:text-orange-400">
            <p>
              This question has been redirected to{" "}
              <span className="font-medium">{question.redirectedName}</span> in{" "}
              <span className="font-medium">
                {question.redirectedDepartment}
              </span>{" "}
              department
            </p>
          </CardContent>
        </Card>
      )}

      {/* Responses */}
      {responses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Responses</h2>

          {responses.map((response) => (
            <Card
              key={response.id}
              className={
                response.isInternal
                  ? "border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900"
                  : ""
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {getAvatarFallback(response.respondentName ?? "---")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {response.respondentName}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1"
                        >
                          {response.respondentDepartment}
                        </Badge>
                        <span>
                          {format(
                            new Date(response.createdAt),
                            "MMM d, yyyy h:mm a",
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  {response.isInternal && (
                    <Badge
                      variant="outline"
                      className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700"
                    >
                      Internal Note
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 whitespace-pre-wrap">
                <p>{response.response}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Response form */}
      {canRespond && question.status !== "Closed" && (
        <div className="space-y-2">
          <Separator />
          <h2 className="text-lg font-semibold mt-4">Add Response</h2>
          <AskHrResponseForm
            questionId={questionId}
            isHrAdmin={canRedirect}
            onResponseSubmitted={() => refetch()}
          />
        </div>
      )}

      {/* Closed question notice */}
      {question.status === "Closed" && (
        <Card className="border border-secondary">
          <CardContent className="p-4">
            <p className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-4 w-4" /> This question has been closed and
              no further responses can be added.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
