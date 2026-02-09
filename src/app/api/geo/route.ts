import { NextResponse } from "next/server";

/**
 * IP-based geolocation fallback.
 * Used when the browser Geolocation API is unavailable (e.g. Linux without GeoClue).
 * Returns city-level accuracy (~1-5 km).
 */
export async function GET() {
  try {
    const res = await fetch("http://ip-api.com/json/?fields=lat,lon", {
      next: { revalidate: 300 },
    });

    if (!res.ok) return NextResponse.json(null, { status: 502 });

    const data = await res.json();

    if (typeof data.lat !== "number" || typeof data.lon !== "number") {
      return NextResponse.json(null, { status: 502 });
    }

    return NextResponse.json({
      latitude: data.lat,
      longitude: data.lon,
      accuracy: 5000,
    });
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
