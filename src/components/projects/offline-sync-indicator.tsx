"use client";

import { useState, useEffect, useCallback } from "react";
import { CloudOff, Upload, Loader2 } from "lucide-react";
import { getPendingPhotoCount } from "@/lib/offline-photo-store";
import { onSyncStatusChange, startSync, isSyncing } from "@/lib/offline-sync";

export function OfflineSyncIndicator() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const count = await getPendingPhotoCount();
      setPendingCount(count);
      setSyncing(isSyncing());
    } catch {
      // IndexedDB might not be available
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = onSyncStatusChange(refresh);

    const handleOnline = () => {
      setIsOnline(true);
      startSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    // Poll periodically
    const interval = setInterval(refresh, 5000);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [refresh]);

  if (pendingCount === 0 && isOnline) return null;

  return (
    <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-muted border">
      {!isOnline && <CloudOff className="h-3 w-3 text-amber-500" />}
      {syncing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span>Syncing photos...</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <Upload className="h-3 w-3 text-muted-foreground" />
          <span>
            {pendingCount} photo{pendingCount > 1 ? "s" : ""} pending upload
          </span>
        </>
      ) : (
        <span>Offline</span>
      )}
    </div>
  );
}
