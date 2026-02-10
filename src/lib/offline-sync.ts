import {
  getPendingPhotos,
  removePendingPhoto,
  updatePhotoStatus,
  type PendingPhoto,
} from "./offline-photo-store";

const SYNC_CHANNEL = "photo-sync";
let syncing = false;
let listeners: Array<() => void> = [];

export function onSyncStatusChange(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notifyListeners() {
  for (const l of listeners) l();
}

function broadcastSyncComplete(projectId: number) {
  try {
    const channel = new BroadcastChannel(SYNC_CHANNEL);
    channel.postMessage({ type: "PHOTO_SYNC_COMPLETE", projectId });
    channel.close();
  } catch {
    // BroadcastChannel not supported
  }
}

async function uploadSinglePhoto(photo: PendingPhoto): Promise<boolean> {
  if (!photo.id) return false;

  try {
    await updatePhotoStatus(photo.id, "uploading");
    notifyListeners();

    const blob = new Blob([photo.blob], { type: photo.mimeType });

    // 1. Get presigned URL
    const presignedRes = await fetch("/api/r2/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: photo.fileName,
        contentType: photo.mimeType,
        size: photo.fileSize,
      }),
    });

    if (!presignedRes.ok) throw new Error("Failed to get presigned URL");

    const { presignedUrl, key, publicUrl } = await presignedRes.json();

    // 2. Upload to R2
    const uploadRes = await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": photo.mimeType },
      body: blob,
    });

    if (!uploadRes.ok) throw new Error("R2 upload failed");

    // 3. Create record in DB
    const apiRes = await fetch(`/api/projects/${photo.projectId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photos: [
          {
            fileUrl: publicUrl,
            fileKey: key,
            fileName: photo.fileName,
            fileSize: photo.fileSize,
            mimeType: photo.mimeType,
            latitude: photo.latitude,
            longitude: photo.longitude,
            accuracy: photo.accuracy,
            category: photo.category,
            note: photo.note,
            capturedAt: photo.capturedAt,
            milestoneId: photo.milestoneId,
            tags: photo.tags,
          },
        ],
      }),
    });

    if (!apiRes.ok) throw new Error("API save failed");

    await removePendingPhoto(photo.id);
    notifyListeners();
    broadcastSyncComplete(photo.projectId);
    return true;
  } catch {
    if (photo.id) {
      // Always keep as "pending" so it can be retried — photos are never lost
      await updatePhotoStatus(photo.id, "pending", (photo.retryCount || 0) + 1);
      notifyListeners();
    }
    return false;
  }
}

export async function startSync(): Promise<void> {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  notifyListeners();

  try {
    const photos = await getPendingPhotos();
    const pending = photos.filter(
      (p) => p.status === "pending" || p.status === "uploading",
    );

    for (const photo of pending) {
      if (!navigator.onLine) break;

      await uploadSinglePhoto(photo);

      // Small delay between uploads
      await new Promise((r) => setTimeout(r, 500));
    }
  } finally {
    syncing = false;
    notifyListeners();
  }
}

export function isSyncing(): boolean {
  return syncing;
}

export async function retryPhoto(id: number): Promise<boolean> {
  // Reset status to pending and reset retry count so it gets picked up by startSync
  await updatePhotoStatus(id, "pending", 0);
  notifyListeners();
  if (navigator.onLine) {
    return startSync().then(() => true);
  }
  return false;
}

export async function registerBackgroundSync(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    // @ts-expect-error -- Background Sync API types not in lib.dom
    if (registration.sync) {
      // @ts-expect-error -- Background Sync API types not in lib.dom
      await registration.sync.register("photo-upload");
    }
  } catch {
    // Background Sync not supported — will rely on online event
  }
}

// Auto-start sync when going online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    startSync();
  });

  // Listen for SW messages to trigger sync
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type === "TRIGGER_PHOTO_SYNC") {
      startSync();
    }
  });
}
