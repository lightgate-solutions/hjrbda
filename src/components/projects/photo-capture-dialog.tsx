"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  X,
  ChevronRight,
  ChevronLeft,
  Upload,
  ImagePlus,
  Plus,
  MapPin,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentPosition, type GeoPosition } from "@/lib/geo-utils";
import { savePhotoOffline } from "@/lib/offline-photo-store";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = [
  { value: "progress", label: "Progress" },
  { value: "completion", label: "Completion" },
  { value: "inspection", label: "Inspection" },
  { value: "incident", label: "Incident" },
  { value: "asset", label: "Asset" },
  { value: "other", label: "Other" },
] as const;

interface CapturedPhoto {
  blob: Blob;
  previewUrl: string;
  geoPosition: GeoPosition | null;
  capturedAt: Date;
  fileName: string;
}

interface PhotoMetadata {
  category: string;
  note: string;
  tags: string[];
  milestoneId: number | null;
}

type Milestone = {
  id: number;
  title: string;
};

interface PhotoCaptureDialogProps {
  projectId: number;
  milestones: Milestone[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhotoCaptureDialog({
  projectId,
  milestones,
  open,
  onOpenChange,
}: PhotoCaptureDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [metadata, setMetadata] = useState<PhotoMetadata>({
    category: "other",
    note: "",
    tags: [],
    milestoneId: null,
  });
  const [newTag, setNewTag] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // GPS state — acquired when transitioning from capture to review
  const [gpsStatus, setGpsStatus] = useState<
    "idle" | "acquiring" | "acquired" | "failed"
  >("idle");

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Camera API not available. Make sure you're using HTTPS or localhost.",
        );
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      } catch {
        // Fallback without facingMode constraint (e.g. desktop with only front camera)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      const detail =
        err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : `Could not access camera: ${detail}`;
      setCameraError(message);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (open && step === 1) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, step, startCamera, stopCamera]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) return;

    const now = new Date();
    const fileName = `photo-${now.getTime()}.jpg`;

    setPhotos((prev) => [
      ...prev,
      {
        blob,
        previewUrl: URL.createObjectURL(blob),
        geoPosition: null,
        capturedAt: now,
        fileName,
      },
    ]);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const now = new Date();
        setPhotos((prev) => [
          ...prev,
          {
            blob: file,
            previewUrl: URL.createObjectURL(file),
            geoPosition: null,
            capturedAt: now,
            fileName: file.name,
          },
        ]);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [],
  );

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const photo = prev[index];
      URL.revokeObjectURL(photo.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (metadata.tags.length >= 10) {
      toast.error("Maximum 10 tags allowed");
      return;
    }
    if (metadata.tags.includes(trimmed.toLowerCase())) {
      toast.error("Tag already exists");
      return;
    }
    setMetadata((prev) => ({
      ...prev,
      tags: [...prev.tags, trimmed.toLowerCase()],
    }));
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    setMetadata((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const proceedToReview = async () => {
    stopCamera();
    setGpsStatus("acquiring");

    const position = await getCurrentPosition(10000);

    if (position) {
      // Stamp all captured photos with the resolved position
      setPhotos((prev) => prev.map((p) => ({ ...p, geoPosition: position })));
      setGpsStatus("acquired");
    } else {
      setGpsStatus("failed");
      toast.warning(
        "Could not get GPS coordinates. Photos will upload without location data.",
      );
    }

    setStep(2);
  };

  const uploadPhotos = async () => {
    setUploading(true);
    setUploadProgress(0);
    setUploadedCount(0);

    const isOnline = navigator.onLine;

    if (!isOnline) {
      // Save to IndexedDB for offline sync
      for (const photo of photos) {
        const arrayBuffer = await photo.blob.arrayBuffer();
        await savePhotoOffline({
          projectId,
          milestoneId: metadata.milestoneId,
          blob: arrayBuffer,
          fileName: photo.fileName,
          mimeType: photo.blob.type || "image/jpeg",
          fileSize: photo.blob.size,
          latitude: photo.geoPosition?.latitude ?? null,
          longitude: photo.geoPosition?.longitude ?? null,
          accuracy: photo.geoPosition?.accuracy ?? null,
          category: metadata.category,
          note: metadata.note,
          tags: metadata.tags,
          capturedAt: photo.capturedAt.toISOString(),
          status: "pending",
          retryCount: 0,
          createdAt: new Date().toISOString(),
        });
      }
      toast.success("Photos saved. They'll upload when you're back online.");
      cleanup();
      return;
    }

    try {
      const uploadedPhotos = [];
      const total = photos.length;

      for (let i = 0; i < total; i++) {
        const photo = photos[i];

        // 1. Get presigned URL
        const presignedRes = await fetch("/api/r2/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: photo.fileName,
            contentType: photo.blob.type || "image/jpeg",
            size: photo.blob.size,
          }),
        });

        if (!presignedRes.ok) {
          toast.error(`Failed to get upload URL for ${photo.fileName}`);
          continue;
        }

        const { presignedUrl, key, publicUrl } = await presignedRes.json();

        // 2. Upload to R2 with XHR for progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const fileProgress = event.loaded / event.total;
              const overallProgress = ((i + fileProgress) / total) * 100;
              setUploadProgress(Math.round(overallProgress));
            }
          };
          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 204) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.open("PUT", presignedUrl);
          xhr.setRequestHeader("Content-Type", photo.blob.type || "image/jpeg");
          xhr.send(photo.blob);
        });

        uploadedPhotos.push({
          fileUrl: publicUrl,
          fileKey: key,
          fileName: photo.fileName,
          fileSize: photo.blob.size,
          mimeType: photo.blob.type || "image/jpeg",
          latitude: photo.geoPosition?.latitude ?? null,
          longitude: photo.geoPosition?.longitude ?? null,
          accuracy: photo.geoPosition?.accuracy ?? null,
          category: metadata.category,
          note: metadata.note,
          capturedAt: photo.capturedAt.toISOString(),
          milestoneId: metadata.milestoneId,
          tags: metadata.tags,
        });

        setUploadedCount(i + 1);
      }

      // 3. Create photo records in DB
      if (uploadedPhotos.length > 0) {
        const res = await fetch(`/api/projects/${projectId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photos: uploadedPhotos }),
        });

        if (!res.ok) {
          throw new Error("Failed to save photo records");
        }
      }

      setUploadProgress(100);
      toast.success(
        `${uploadedPhotos.length} photo${uploadedPhotos.length > 1 ? "s" : ""} uploaded successfully!`,
      );
      queryClient.invalidateQueries({
        queryKey: ["project-photos", projectId],
      });
      cleanup();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload photos",
      );
      setUploading(false);
    }
  };

  const cleanup = () => {
    for (const photo of photos) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    setPhotos([]);
    setMetadata({ category: "other", note: "", tags: [], milestoneId: null });
    setNewTag("");
    setStep(1);
    setUploading(false);
    setUploadProgress(0);
    setUploadedCount(0);
    stopCamera();
    setGpsStatus("idle");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          stopCamera();
          for (const photo of photos) {
            URL.revokeObjectURL(photo.previewUrl);
          }
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Capture Photos"}
            {step === 2 && "Review & Tag"}
            {step === 3 && "Uploading..."}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Capture */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {cameraError ? (
                <div className="flex items-center justify-center h-full text-white text-sm p-4 text-center">
                  {cameraError}
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex items-center justify-center gap-3">
              {cameraActive && (
                <Button
                  size="lg"
                  className="rounded-full h-16 w-16"
                  onClick={capturePhoto}
                >
                  <Camera className="h-6 w-6" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Gallery
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {photos.length > 0 && (
              <>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {photos.map((photo, i) => (
                    <div key={photo.previewUrl} className="relative shrink-0">
                      <img
                        src={photo.previewUrl}
                        alt={`Capture ${i + 1}`}
                        className="h-20 w-20 object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {photos.length} photo
                    {photos.length > 1 ? "s" : ""} captured
                  </span>
                  <Button
                    onClick={proceedToReview}
                    disabled={gpsStatus === "acquiring"}
                  >
                    {gpsStatus === "acquiring" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Getting location...
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Review & Tag */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((photo, i) => (
                <div key={photo.previewUrl} className="relative group">
                  <img
                    src={photo.previewUrl}
                    alt={`Capture ${i + 1}`}
                    className="h-24 w-full object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {photo.geoPosition && (
                    <div className="absolute bottom-1 left-1 bg-black/60 rounded px-1 py-0.5 text-[10px] text-white flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      GPS
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={metadata.category}
                  onValueChange={(v) =>
                    setMetadata((prev) => ({
                      ...prev,
                      category: v,
                    }))
                  }
                >
                  <SelectTrigger>
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
              </div>

              <div className="space-y-1">
                <Label>Milestone (optional)</Label>
                <Select
                  value={
                    metadata.milestoneId ? String(metadata.milestoneId) : "none"
                  }
                  onValueChange={(v) =>
                    setMetadata((prev) => ({
                      ...prev,
                      milestoneId: v === "none" ? null : Number(v),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No milestone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No milestone</SelectItem>
                    {milestones.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Note (optional)</Label>
              <Textarea
                value={metadata.note}
                onChange={(e) =>
                  setMetadata((prev) => ({
                    ...prev,
                    note: e.target.value.slice(0, 500),
                  }))
                }
                placeholder="Add a note..."
                rows={2}
              />
              <span className="text-xs text-muted-foreground">
                {metadata.note.length}/500
              </span>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addTag}
                  disabled={!newTag.trim() || metadata.tags.length >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {metadata.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* GPS info */}
            <div className="text-xs flex items-center gap-1">
              {gpsStatus === "acquired" ? (
                <>
                  <MapPin className="h-3 w-3 text-green-500" />
                  <span className="text-green-600">
                    GPS coordinates attached to all photos
                  </span>
                </>
              ) : (
                <>
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    No GPS coordinates — photos will upload without location
                  </span>
                </>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={() => {
                  setStep(3);
                  uploadPhotos();
                }}
                disabled={photos.length === 0}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload {photos.length} Photo
                {photos.length > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Upload Progress */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              ) : (
                <div className="h-8 w-8 mx-auto text-green-500">Done</div>
              )}
              <p className="text-sm text-muted-foreground">
                {uploading
                  ? `Uploading ${uploadedCount + 1} of ${photos.length}...`
                  : "Upload complete!"}
              </p>
            </div>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-center text-xs text-muted-foreground">
              {uploadProgress}%
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
