"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { startSync } from "@/lib/offline-sync";

export function ServiceWorkerRegister() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "activated" &&
                navigator.serviceWorker.controller
              ) {
                console.log("New service worker activated");
              }
            });
          }
        });

        // Warm the /photos/upload page into cache so it's always available offline.
        // A simple fetch is enough — the SW fetch handler caches navigation responses.
        if (navigator.onLine) {
          fetch("/photos/upload").catch(() => {});
        }
      })
      .catch((err) => {
        console.error("SW registration failed:", err);
      });

    // Listen for SW_UPDATED message from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SW_UPDATED") {
        toast("Update available", {
          description: "A new version is available. Reload to update.",
          action: {
            label: "Reload",
            onClick: () => window.location.reload(),
          },
          duration: 15000,
        });
      }
    });

    // Listen for photo sync completion via BroadcastChannel
    let syncChannel: BroadcastChannel | null = null;
    try {
      syncChannel = new BroadcastChannel("photo-sync");
      syncChannel.onmessage = (event) => {
        if (event.data?.type === "PHOTO_SYNC_COMPLETE") {
          const { projectId } = event.data;
          queryClient.invalidateQueries({
            queryKey: ["project-photos", projectId],
          });
          queryClient.invalidateQueries({
            queryKey: ["project-photos"],
          });
        }
      };
    } catch {
      // BroadcastChannel not supported
    }

    return () => {
      syncChannel?.close();
    };
  }, [queryClient]);

  // Listen for SW trigger to start sync (from Background Sync handler)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "TRIGGER_PHOTO_SYNC") {
        startSync();
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handler);
    };
  }, []);

  return null;
}
