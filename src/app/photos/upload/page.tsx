"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Camera,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  RotateCw,
  CloudUpload,
  ArrowLeft,
} from "lucide-react";
import { PhotoCaptureDialog } from "@/components/projects/photo-capture-dialog";
import {
  getCachedProjects,
  getPendingPhotos,
  type CachedProject,
  type PendingPhoto,
} from "@/lib/offline-photo-store";
import {
  startSync,
  isSyncing,
  onSyncStatusChange,
  registerBackgroundSync,
  retryPhoto,
} from "@/lib/offline-sync";
import { useProjects } from "@/hooks/projects/use-projects";
import { toast } from "sonner";
import Link from "next/link";

export default function OfflinePhotoUploadPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null,
  );
  const [captureOpen, setCaptureOpen] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [cachedProjects, setCachedProjectsList] = useState<CachedProject[]>([]);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [syncing, setSyncing] = useState(false);

  // Fetch projects from API when online — this also caches them in IndexedDB
  const { data: projectsData } = useProjects({
    limit: 100,
    sortBy: "name",
    sortDirection: "asc",
  });

  // Build combined project list: prefer API data when available, fall back to cache
  const projects: CachedProject[] =
    projectsData?.projects.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      status: p.status,
    })) ?? cachedProjects;

  // Load cached projects from IndexedDB on mount
  useEffect(() => {
    getCachedProjects()
      .then(setCachedProjectsList)
      .catch(() => {});
  }, []);

  const loadPendingPhotos = useCallback(() => {
    getPendingPhotos()
      .then(setPendingPhotos)
      .catch(() => {});
  }, []);

  // Load pending photos on mount and subscribe to sync changes
  useEffect(() => {
    loadPendingPhotos();
    const unsub = onSyncStatusChange(() => {
      setSyncing(isSyncing());
      loadPendingPhotos();
    });
    return unsub;
  }, [loadPendingPhotos]);

  // Track online/offline status
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const handleSyncNow = async () => {
    if (!isOnline) {
      toast.error("You're offline. Connect to the internet to sync.");
      return;
    }
    await startSync();
    loadPendingPhotos();
  };

  const handleRetry = async (id: number) => {
    await retryPhoto(id);
    loadPendingPhotos();
    toast.success("Queued for retry.");
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const pendingByStatus = {
    pending: pendingPhotos.filter((p) => p.status === "pending"),
    uploading: pendingPhotos.filter((p) => p.status === "uploading"),
    failed: pendingPhotos.filter((p) => p.status === "failed"),
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/projects" className="shrink-0">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Upload Photos</h1>
          <p className="text-sm text-muted-foreground">
            Capture and upload project photos — works offline
          </p>
        </div>
      </div>

      {/* Online status indicator */}
      <div className="flex items-center gap-2 text-sm">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-green-600">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-orange-500" />
            <span className="text-orange-600">
              Offline — photos will sync when back online
            </span>
          </>
        )}
      </div>

      {/* Project Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={selectedProjectId ? String(selectedProjectId) : ""}
            onValueChange={(v) => setSelectedProjectId(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a project..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.code} — {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedProject && (
            <Button onClick={() => setCaptureOpen(true)} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Capture Photos for {selectedProject.code}
            </Button>
          )}

          {projects.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No projects available. Visit the Projects page while online to
              cache the project list.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pending Upload Queue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Upload Queue</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPendingPhotos}
              disabled={syncing}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleSyncNow}
              disabled={syncing || !isOnline || pendingPhotos.length === 0}
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <CloudUpload className="h-3.5 w-3.5 mr-1.5" />
              )}
              Sync Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingPhotos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No pending uploads
            </p>
          ) : (
            <div className="space-y-2">
              {/* Summary */}
              <div className="flex gap-2 flex-wrap">
                {pendingByStatus.pending.length > 0 && (
                  <Badge variant="secondary">
                    {pendingByStatus.pending.length} pending
                  </Badge>
                )}
                {pendingByStatus.uploading.length > 0 && (
                  <Badge variant="default">
                    {pendingByStatus.uploading.length} uploading
                  </Badge>
                )}
                {pendingByStatus.failed.length > 0 && (
                  <Badge variant="destructive">
                    {pendingByStatus.failed.length} failed
                  </Badge>
                )}
              </div>

              {/* Individual items */}
              <div className="divide-y">
                {pendingPhotos.map((photo) => {
                  const project = projects.find(
                    (p) => p.id === photo.projectId,
                  );
                  return (
                    <div
                      key={photo.id}
                      className="flex items-center justify-between py-2 gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {photo.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {project?.code ?? `Project #${photo.projectId}`}{" "}
                          &middot; {photo.category} &middot;{" "}
                          {new Date(photo.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={
                            photo.status === "failed"
                              ? "destructive"
                              : photo.status === "uploading"
                                ? "default"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {photo.status}
                        </Badge>
                        {photo.status === "failed" && photo.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              if (photo.id) handleRetry(photo.id);
                            }}
                          >
                            <RotateCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Capture Dialog */}
      {selectedProjectId && (
        <PhotoCaptureDialog
          projectId={selectedProjectId}
          milestones={[]}
          open={captureOpen}
          onOpenChange={(open) => {
            setCaptureOpen(open);
            if (!open) {
              loadPendingPhotos();
              registerBackgroundSync();
            }
          }}
        />
      )}
    </div>
  );
}
