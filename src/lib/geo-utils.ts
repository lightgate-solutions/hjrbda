export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Cascading geolocation:
 *  1. GPS (enableHighAccuracy — precise on mobile, times out fast on desktop)
 *  2. WiFi / cell tower (enableHighAccuracy off)
 *  3. IP-based server-side fallback (~city-level)
 */
export async function getCurrentPosition(
  timeoutMs = 10000,
): Promise<GeoPosition | null> {
  if ("geolocation" in navigator) {
    // 1. Try GPS-level accuracy first (5s timeout — enough for a warm GPS)
    const gps = await browserGeo(true, Math.min(timeoutMs, 5000));
    if (gps) return gps;

    // 2. Try low-accuracy / WiFi with remaining budget
    const wifi = await browserGeo(false, timeoutMs);
    if (wifi) return wifi;
  }

  // 3. Browser API unavailable or failed — IP fallback
  return getIpPosition();
}

function browserGeo(
  highAccuracy: boolean,
  timeoutMs: number,
): Promise<GeoPosition | null> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: 60000,
      },
    );
  });
}

async function getIpPosition(): Promise<GeoPosition | null> {
  try {
    const res = await fetch("/api/geo");
    if (!res.ok) return null;
    const data = await res.json();
    if (
      typeof data.latitude === "number" &&
      typeof data.longitude === "number"
    ) {
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy ?? 5000,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function formatCoordinate(value: number | string | null): string {
  if (value === null || value === undefined) return "N/A";
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  if (Number.isNaN(num)) return "N/A";
  return num.toFixed(6);
}

export function formatAccuracy(value: number | string | null): string {
  if (value === null || value === undefined) return "N/A";
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  if (Number.isNaN(num)) return "N/A";
  if (num < 10) return `${num.toFixed(1)}m (High)`;
  if (num < 50) return `${num.toFixed(0)}m (Medium)`;
  return `${num.toFixed(0)}m (Low)`;
}
