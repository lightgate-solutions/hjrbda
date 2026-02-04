/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface LeaveApprovalDialogProps {
  leave: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function LeaveApprovalDialog({
  leave,
  onSuccess,
  onCancel,
}: LeaveApprovalDialogProps) {
  const [action, setAction] = useState<"approve" | "reject" | "review" | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/hr/leaves/${leave.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          updates: {
            status: "Approved",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to approve leave");
        return;
      }

      toast.success("Leave approved successfully");
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      onSuccess?.();
    } catch (_error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/hr/leaves/${leave.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          updates: {
            status: "Rejected",
            rejectionReason,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to reject leave");
        return;
      }

      toast.success("Leave rejected");
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      onSuccess?.();
    } catch (_error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-muted-foreground">Employee</p>
            <p>{leave.employeeName}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Leave Type</p>
            <p>{leave.leaveType}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Duration</p>
            <p>
              {new Date(leave.startDate).toLocaleDateString()} -{" "}
              {new Date(leave.endDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Total Days</p>
            <p>{leave.totalDays} days</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="font-medium text-muted-foreground">Reason</p>
          <p className="mt-1 text-sm">{leave.reason}</p>
        </div>
      </div>

      {action === null && (
        <div className="flex gap-2">
          <Button
            onClick={() => setAction("approve")}
            className="flex-1"
            variant="default"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button
            onClick={() => setAction("review")}
            className="flex-1"
            variant="outline"
          >
            <Loader2 className="mr-2 h-4 w-4" />
            To be reviewed
          </Button>
          <Button
            onClick={() => setAction("reject")}
            className="flex-1"
            variant="destructive"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
          {onCancel && (
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
          )}
        </div>
      )}

      {action === "approve" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to approve this leave application?
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Approval
            </Button>
            <Button
              onClick={() => setAction(null)}
              variant="outline"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {action === "review" && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="reviewReason">Review Reason *</Label>
            <Textarea
              id="reviewReason"
              placeholder="Please provide a reason why this leave needs to be reviewed..."
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                if (!reviewReason.trim()) {
                  toast.error("Please provide a reason for review");
                  return;
                }

                setIsSubmitting(true);
                try {
                  const response = await fetch(`/api/hr/leaves/${leave.id}`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      updates: {
                        status: "To be reviewed",
                        rejectionReason: reviewReason,
                      },
                    }),
                  });

                  const data = await response.json();

                  if (!response.ok) {
                    toast.error(data.error || "Failed to mark for review");
                    return;
                  }

                  toast.success("Leave marked for review");
                  queryClient.invalidateQueries({ queryKey: ["leaves"] });
                  onSuccess?.();
                } catch (_error) {
                  toast.error("An error occurred. Please try again.");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting || !reviewReason.trim()}
              variant="outline"
              className="flex-1"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Review
            </Button>
            <Button
              onClick={() => {
                setAction(null);
                setReviewReason("");
              }}
              variant="outline"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {action === "reject" && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="rejectionReason">Rejection Reason *</Label>
            <Textarea
              id="rejectionReason"
              placeholder="Please provide a reason for rejecting this leave application..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleReject}
              disabled={isSubmitting || !rejectionReason.trim()}
              variant="destructive"
              className="flex-1"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Rejection
            </Button>
            <Button
              onClick={() => {
                setAction(null);
                setRejectionReason("");
              }}
              variant="outline"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
