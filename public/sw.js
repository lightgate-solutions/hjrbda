const CACHE_NAME = "hjrbda-v7";
const OFFLINE_FALLBACK = "/photos/upload";
const STATIC_ASSETS = [
  "/",
  OFFLINE_FALLBACK,
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
  "/icon.png",
];

// Track critical chunks that need to be cached for offline upload page
const criticalChunks = new Set();

// Track if we've successfully cached the offline page
let offlinePageCached = false;

// Install: cache static assets and offline page with all dependencies
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Cache static assets first
      console.log("[SW] Caching static assets...");
      await cache.addAll(STATIC_ASSETS);

      // Aggressively cache the offline page and all its dependencies
      try {
        console.log("[SW] Fetching and caching /photos/upload page...");
        const offlinePageResponse = await fetch(OFFLINE_FALLBACK, {
          credentials: "include",
          cache: "no-cache", // Ensure we get the latest version
        });

        if (!offlinePageResponse.ok) {
          console.warn("[SW] Failed to fetch /photos/upload during install:", offlinePageResponse.status);
          console.log("[SW] Page will be cached on first visit instead");
          return;
        }

        // Cache the HTML page itself
        await cache.put(OFFLINE_FALLBACK, offlinePageResponse.clone());
        offlinePageCached = true;

        const html = await offlinePageResponse.text();
        console.log("[SW] Extracting chunks from HTML...");

        // Extract all Next.js resource URLs from the HTML
        const chunkRegex = new RegExp('"(/_next/static/[^"]+)"', 'g');
        const chunkMatches = html.matchAll(chunkRegex);
        const chunkUrls = [...new Set(Array.from(chunkMatches, (m) => m[1]))]; // Deduplicate

        console.log(`[SW] Found ${chunkUrls.length} chunks to cache`);

        // Cache all chunks in parallel with aggressive error handling
        const chunkResults = await Promise.allSettled(
          chunkUrls.map(async (url) => {
            try {
              const res = await fetch(url, { cache: "force-cache" });
              if (res.ok) {
                await cache.put(url, res);
                criticalChunks.add(url);
                return { url, success: true };
              }
              return { url, success: false, status: res.status };
            } catch (error) {
              return { url, success: false, error: error.message };
            }
          })
        );

        const successCount = chunkResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
        console.log(`[SW] Successfully cached ${successCount}/${chunkUrls.length} chunks`);

        // Notify all clients that offline mode is ready
        self.clients.matchAll({ type: "window" }).then((clients) => {
          for (const client of clients) {
            client.postMessage({
              type: "OFFLINE_READY",
              cachedChunks: successCount,
              totalChunks: chunkUrls.length
            });
          }
        });

      } catch (error) {
        console.error("[SW] Error pre-caching offline page:", error);
        console.log("[SW] Will attempt to cache on first navigation instead");
      }

      console.log("[SW] Service worker installation complete!");
    })()
  );

  self.skipWaiting();
});

// Activate: clean old caches and notify clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => {
        // Notify all clients that a new SW version activated
        return self.clients.matchAll({ type: "window" }).then((clients) => {
          for (const client of clients) {
            client.postMessage({ type: "SW_UPDATED" });
          }
        });
      }),
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith("http")) return;

  // Skip API routes — these should never be served from cache
  if (url.pathname.startsWith("/api/")) return;

  // Skip cross-origin requests — let browser handle map tiles, CDN assets, etc.
  if (url.origin !== self.location.origin) return;

  // For navigation requests: network-first, redirect to /photos/upload when offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(async (cache) => {
              await cache.put(request, clone);

              // Also extract and cache chunks from this page
              try {
                const html = await response.clone().text();
                const chunkRegex = new RegExp('"(/_next/static/[^"]+)"', 'g');
                const chunkMatches = html.matchAll(chunkRegex);
                const chunkUrls = Array.from(chunkMatches, (m) => m[1]);

                // Proactively cache chunks in background
                Promise.allSettled(
                  chunkUrls.map(async (chunkUrl) => {
                    try {
                      const cached = await cache.match(chunkUrl);
                      if (!cached) {
                        const res = await fetch(chunkUrl);
                        if (res.ok) await cache.put(chunkUrl, res);
                      }
                    } catch (_e) {
                      // Silently fail
                    }
                  })
                );
              } catch (_e) {
                // Ignore parsing errors
              }
            });
          }
          return response;
        })
        .catch(async () => {
          // Offline: if already going to /photos/upload, serve from cache
          if (url.pathname === OFFLINE_FALLBACK) {
            const cached = await caches.match(OFFLINE_FALLBACK);
            if (cached) return cached;

            // Fallback: create a minimal offline page
            return new Response(
              `<!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>Offline - HJRBDA</title>
                  <style>
                    body {
                      font-family: system-ui, -apple-system, sans-serif;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      min-height: 100vh;
                      margin: 0;
                      background: #f5f5f5;
                    }
                    .container {
                      text-align: center;
                      padding: 2rem;
                      background: white;
                      border-radius: 8px;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    h1 { margin: 0 0 1rem; }
                    p { color: #666; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>You're Offline</h1>
                    <p>Please connect to the internet and refresh the page.</p>
                    <p>Visit <strong>/photos/upload</strong> while online to enable offline photo uploads.</p>
                  </div>
                </body>
              </html>`,
              {
                status: 200,
                headers: { "Content-Type": "text/html" },
              }
            );
          }

          // Offline: try to serve other pages from cache
          const cached = await caches.match(request);
          if (cached) return cached;

          // Last resort: redirect to /photos/upload
          return Response.redirect(OFFLINE_FALLBACK, 302);
        }),
    );
    return;
  }

  // Next.js build assets (/_next/static/**) — cache-first (content-hashed, immutable)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((response) => {
              if (response.ok) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
              }
              return response;
            })
            .catch((err) => {
              // If chunk fails to load and we have no cache, return a helpful error
              console.error("Failed to load chunk:", url.pathname, err);
              return new Response("", { status: 404 });
            }),
      ),
    );
    return;
  }

  // Next.js data/chunks (/_next/) — network-first with cache fallback
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || fetch(request)),
        ),
    );
    return;
  }

  // All other same-origin assets (images, CSS, JS, fonts) — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    }),
  );
});

// Background Sync: photo-upload
self.addEventListener("sync", (event) => {
  if (event.tag === "photo-upload") {
    event.waitUntil(handlePhotoSync());
  }
});

async function handlePhotoSync() {
  // Try to notify an open client to run startSync()
  const clients = await self.clients.matchAll({ type: "window" });
  if (clients.length > 0) {
    clients[0].postMessage({ type: "TRIGGER_PHOTO_SYNC" });
    return;
  }

  // Fallback: process queue directly from SW if no clients open
  try {
    const { openDB } = await import("https://cdn.jsdelivr.net/npm/idb@8/+esm");
    const db = await openDB("hjrbda-photos", 2, {});
    const photos = await db.getAll("pending-uploads");
    const pending = photos.filter(
      (p) => p.status === "pending" || p.status === "uploading",
    );

    for (const photo of pending) {
      if (!photo.id) continue;
      try {
        photo.status = "uploading";
        await db.put("pending-uploads", photo);

        const blob = new Blob([photo.blob], { type: photo.mimeType });

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

        const uploadRes = await fetch(presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": photo.mimeType },
          body: blob,
        });
        if (!uploadRes.ok) throw new Error("R2 upload failed");

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

        await db.delete("pending-uploads", photo.id);
      } catch {
        photo.status = "pending";
        photo.retryCount = (photo.retryCount || 0) + 1;
        await db.put("pending-uploads", photo);
      }
    }
  } catch {
    // IndexedDB import or access failed in SW context — will retry on next sync
  }
}

// Push notifications
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/web-app-manifest-192x192.png",
      badge: "/badge.png",
      tag: "app-notification",
      vibrate: [100, 50, 100],
      requireInteraction: data.persistent || false,
      data: {
        dateOfArrival: Date.now(),
        url: data.url || "/",
      },
      actions: [
        {
          action: "open",
          title: "Open HJRBDA",
        },
        {
          action: "close",
          title: "Dismiss",
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "Notification", options),
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const urlToOpen = event.notification.data.url || "/";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if ("focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});
