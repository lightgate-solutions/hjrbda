const CACHE_NAME = "hjrbda-v4";
const OFFLINE_FALLBACK = "/photos/upload";
const STATIC_ASSETS = [
  "/",
  OFFLINE_FALLBACK,
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
  "/icon.png",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
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
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Offline: if already going to /photos/upload, serve from cache
          if (url.pathname === OFFLINE_FALLBACK) {
            return caches
              .match(OFFLINE_FALLBACK)
              .then((cached) => cached || new Response("Offline"));
          }
          // Offline: redirect everything else to /photos/upload
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
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
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
