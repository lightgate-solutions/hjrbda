"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Clock, User, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ProjectPhoto } from "@/hooks/projects/use-project-photos";
import { formatCoordinate, formatAccuracy } from "@/lib/geo-utils";
import dynamic from "next/dynamic";

const PhotoLocationMiniMap = dynamic(
  () => import("./project-photos-map").then((m) => m.PhotoLocationMiniMap),
  { ssr: false },
);

interface PhotoDetailDialogProps {
  photo: ProjectPhoto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  isEditable: boolean;
  onDeleted: () => void;
}

export function PhotoDetailDialog({
  photo,
  open,
  onOpenChange,
  projectId,
  isEditable,
  onDeleted,
}: PhotoDetailDialogProps) {
  if (!photo) return null;

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: photo.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete photo");
      }
      toast.success("Photo deleted");
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete photo",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Photo Details</span>
            {isEditable && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Full-size photo */}
          <div className="rounded-lg overflow-hidden border bg-black">
            <img
              src={photo.fileUrl}
              alt={photo.note || photo.fileName}
              className="w-full max-h-[50vh] object-contain"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Metadata */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="capitalize">{photo.category}</Badge>
                {photo.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="gap-1">
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </Badge>
                ))}
              </div>

              {photo.note && <p className="text-sm">{photo.note}</p>}

              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  <span>{photo.uploaderName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{new Date(photo.capturedAt).toLocaleString()}</span>
                </div>
                {photo.latitude && photo.longitude && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>
                      {formatCoordinate(photo.latitude)},{" "}
                      {formatCoordinate(photo.longitude)}
                      {photo.accuracy && ` (${formatAccuracy(photo.accuracy)})`}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                {photo.fileName} &middot; {(photo.fileSize / 1024).toFixed(0)}{" "}
                KB
              </div>
            </div>

            {/* Mini map */}
            {photo.latitude && photo.longitude && (
              <div className="h-48 rounded-lg overflow-hidden border">
                <PhotoLocationMiniMap
                  latitude={Number(photo.latitude)}
                  longitude={Number(photo.longitude)}
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
