"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";

interface TaskReviewActionsProps {
  taskId: number;
  employeeId: number;
}

export function TaskReviewActions({
  taskId,
  employeeId,
}: TaskReviewActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  const handleAccept = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/tasks/${taskId}?employeeId=${employeeId}&role=manager`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Completed" }),
        },
      );

      if (res.ok) {
        // Add a comment noting the acceptance
        await fetch(`/api/tasks/${taskId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: employeeId,
            content: "Task approved and marked as completed.",
          }),
        });

        router.refresh();
        window.dispatchEvent(new CustomEvent("tasks:changed"));
      }
    } catch (error) {
      console.error("Error accepting task:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) return;

    try {
      setLoading(true);
      const res = await fetch(
        `/api/tasks/${taskId}?employeeId=${employeeId}&role=manager`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Todo" }),
        },
      );

      if (res.ok) {
        // Add the rejection comment
        await fetch(`/api/tasks/${taskId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: employeeId,
            content: `Task returned for revision: ${rejectComment.trim()}`,
          }),
        });

        setShowRejectDialog(false);
        setRejectComment("");
        router.refresh();
        window.dispatchEvent(new CustomEvent("tasks:changed"));
      }
    } catch (error) {
      console.error("Error rejecting task:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={handleAccept}
          disabled={loading}
        >
          <Check className="size-4 mr-1" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => setShowRejectDialog(true)}
          disabled={loading}
        >
          <X className="size-4 mr-1" />
          Reject
        </Button>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-comment">
                Provide feedback for the assignee
              </Label>
              <Textarea
                id="reject-comment"
                placeholder="Explain why the task needs revision..."
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectComment.trim() || loading}
            >
              {loading ? "Rejecting..." : "Reject & Return to Todo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
