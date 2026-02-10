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
      .then(async (registration) => {
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

        // Wait for service worker to be ready before warming cache
        await navigator.serviceWorker.ready;

        // Aggressively warm the /photos/upload page and all its dependencies
        if (navigator.onLine) {
          try {
            console.log("[PWA] Warming /photos/upload cache...");

            // Fetch the page HTML
            const pageResponse = await fetch("/photos/upload", {
              credentials: "include",
            });

            if (pageResponse.ok) {
              const html = await pageResponse.text();

              // Extract and prefetch Next.js chunks
              const chunkRegex = /"(\/_next\/static\/[^"]+)"/g;
              const chunkMatches = html.matchAll(chunkRegex);
              const chunkUrls = [
                ...new Set(Array.from(chunkMatches, (m) => m[1])),
              ];

              console.log(`[PWA] Prefetching ${chunkUrls.length} chunks...`);

              // Prefetch all chunks in parallel
              const results = await Promise.allSettled(
                chunkUrls.map((url) => fetch(url)),
              );

              const successCount = results.filter(
                (r) => r.status === "fulfilled",
              ).length;
              console.log(
                `[PWA] Cache warming complete! (${successCount}/${chunkUrls.length} chunks cached)`,
              );

              // Show success notification
              toast.success("Offline mode ready", {
                description:
                  "You can now upload photos even without internet connection.",
                duration: 5000,
              });
            }
          } catch (error) {
            console.warn("[PWA] Failed to warm cache:", error);
          }
        }
      })
      .catch((err) => {
        console.error("SW registration failed:", err);
      });

    // Listen for messages from service worker
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
      } else if (event.data?.type === "OFFLINE_READY") {
        console.log("[PWA] Offline photo upload ready!");
        toast.success("Offline mode ready", {
          description:
            "You can now upload photos even without internet connection.",
          duration: 5000,
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
