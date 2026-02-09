"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, Map as MapIcon, Grid3X3, Loader2 } from "lucide-react";
import type { ProjectPhoto } from "@/hooks/projects/use-project-photos";
import { PhotoDetailDialog } from "./photo-detail-dialog";
import dynamic from "next/dynamic";
import Image from "next/image";

const ProjectPhotosMap = dynamic(
  () => import("./project-photos-map").then((m) => m.ProjectPhotosMap),
  { ssr: false },
);

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "progress", label: "Progress" },
  { value: "completion", label: "Completion" },
  { value: "inspection", label: "Inspection" },
  { value: "incident", label: "Incident" },
  { value: "asset", label: "Asset" },
  { value: "other", label: "Other" },
] as const;

type Milestone = { id: number; title: string };

interface ProjectPhotosGalleryProps {
  photos: ProjectPhoto[];
  milestones: Milestone[];
  isLoading: boolean;
  projectId: number;
  isEditable: boolean;
  categoryFilter: string;
  onCategoryChange: (category: string) => void;
  milestoneFilter: string;
  onMilestoneChange: (milestoneId: string) => void;
  onRefetch: () => void;
  projectLocation?: {
    latitude: number;
    longitude: number;
    label?: string;
  } | null;
}

export function ProjectPhotosGallery({
  photos,
  milestones,
  isLoading,
  projectId,
  isEditable,
  categoryFilter,
  onCategoryChange,
  milestoneFilter,
  onMilestoneChange,
  onRefetch,
  projectLocation,
}: ProjectPhotosGalleryProps) {
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectPhoto | null>(null);

  // Group photos by date
  const photosByDate = photos.reduce(
    (groups, photo) => {
      const date = new Date(photo.capturedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(photo);
      return groups;
    },
    {} as Record<string, ProjectPhoto[]>,
  );

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={milestoneFilter} onValueChange={onMilestoneChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Milestones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Milestones</SelectItem>
            {milestones.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-1">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("map")}
          >
            <MapIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && photos.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-muted/10 border-dashed">
          <p className="text-muted-foreground">No photos yet</p>
        </div>
      )}

      {!isLoading && photos.length > 0 && viewMode === "grid" && (
        <div className="space-y-6">
          {Object.entries(photosByDate).map(([date, datePhotos]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {date}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {datePhotos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setSelectedPhoto(photo)}
                    className="group relative rounded-lg border overflow-hidden bg-card hover:shadow-md hover:border-primary/20 transition-all text-left"
                  >
                    <div className="aspect-square">
                      <Image
                        src={photo.fileUrl}
                        alt={photo.note || photo.fileName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        height={150}
                        width={50}
                      />
                    </div>
                    <div className="p-2 space-y-1">
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="secondary"
                          className="text-[10px] capitalize"
                        >
                          {photo.category}
                        </Badge>
                        {photo.latitude && (
                          <MapPin className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                      {photo.note && (
                        <p className="text-xs text-muted-foreground truncate">
                          {photo.note}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {photo.uploaderName} &middot;{" "}
                        {new Date(photo.capturedAt).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && photos.length > 0 && viewMode === "map" && (
        <ProjectPhotosMap
          photos={photos}
          onPhotoClick={setSelectedPhoto}
          projectLocation={projectLocation}
        />
      )}

      <PhotoDetailDialog
        photo={selectedPhoto}
        open={!!selectedPhoto}
        onOpenChange={(open) => {
          if (!open) setSelectedPhoto(null);
        }}
        projectId={projectId}
        isEditable={isEditable}
        onDeleted={onRefetch}
      />
    </div>
  );
}
