"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ProjectPhoto } from "@/hooks/projects/use-project-photos";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { haversineDistance, formatDistance } from "@/lib/geo-utils";

// Fix default marker icons in Leaflet + webpack/next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

// Red marker for project location
const projectIcon = L.divIcon({
  html: `<div style="background:#dc2626;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

// Custom cluster icon function
// biome-ignore lint/suspicious/noExplicitAny: MarkerCluster type not exported from @types/leaflet
function createClusterIcon(cluster: any) {
  const count = cluster.getChildCount();
  let size: number;
  let bg: string;

  if (count < 10) {
    size = 40;
    bg = "#3b82f6"; // blue
  } else if (count < 50) {
    size = 50;
    bg = "#f59e0b"; // amber
  } else {
    size = 60;
    bg = "#ef4444"; // red
  }

  const fontSize = Math.round(size * 0.35);

  return L.divIcon({
    html: `<div style="
      background:${bg};
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      color:#fff;
      font-weight:700;
      font-size:${fontSize}px;
      border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    ">${count}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface ProjectPhotosMapProps {
  photos: ProjectPhoto[];
  onPhotoClick: (photo: ProjectPhoto) => void;
  projectLocation?: {
    latitude: number;
    longitude: number;
    label?: string;
  } | null;
}

function FitBounds({
  photos,
  projectLocation,
}: {
  photos: ProjectPhoto[];
  projectLocation?: ProjectPhotosMapProps["projectLocation"];
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = photos
      .filter((p) => p.latitude && p.longitude)
      .map((p) => [Number(p.latitude), Number(p.longitude)]);

    if (projectLocation) {
      points.push([projectLocation.latitude, projectLocation.longitude]);
    }

    if (points.length === 0) return;

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [photos, projectLocation, map]);

  return null;
}

export function ProjectPhotosMap({
  photos,
  onPhotoClick,
  projectLocation,
}: ProjectPhotosMapProps) {
  const geoPhotos = photos.filter((p) => p.latitude && p.longitude);

  if (geoPhotos.length === 0 && !projectLocation) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/10 border-dashed">
        <p className="text-muted-foreground">
          No photos with GPS data to display on the map
        </p>
      </div>
    );
  }

  const center: [number, number] = projectLocation
    ? [projectLocation.latitude, projectLocation.longitude]
    : [Number(geoPhotos[0].latitude), Number(geoPhotos[0].longitude)];

  // Calculate distances from project location to each photo
  const distances = projectLocation
    ? geoPhotos.map((p) =>
        haversineDistance(
          projectLocation.latitude,
          projectLocation.longitude,
          Number(p.latitude),
          Number(p.longitude),
        ),
      )
    : [];
  const totalDistance = distances.reduce((sum, d) => sum + d, 0);

  return (
    <div>
      <div className="h-[500px] rounded-lg overflow-hidden border">
        <MapContainer center={center} zoom={13} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds photos={geoPhotos} projectLocation={projectLocation} />
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
            spiderfyOnMaxZoom
            showCoverageOnHover={false}
            iconCreateFunction={createClusterIcon}
          >
            {geoPhotos.map((photo) => (
              <Marker
                key={photo.id}
                position={[Number(photo.latitude), Number(photo.longitude)]}
              >
                <Popup>
                  <div className="w-48">
                    <Image
                      src={photo.fileUrl}
                      alt={photo.note || photo.fileName}
                      width={150}
                      height={150}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                    <div className="space-y-1">
                      <Badge className="capitalize text-[10px]">
                        {photo.category}
                      </Badge>
                      {photo.note && (
                        <p className="text-xs truncate">{photo.note}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {photo.uploaderName} &middot;{" "}
                        {new Date(photo.capturedAt).toLocaleDateString()}
                      </p>
                      <button
                        type="button"
                        className="text-xs text-primary underline"
                        onClick={() => onPhotoClick(photo)}
                      >
                        View details
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>

          {/* Project location marker */}
          {projectLocation && (
            <>
              <Marker
                position={[projectLocation.latitude, projectLocation.longitude]}
                icon={projectIcon}
              >
                <Popup>
                  <div className="text-sm font-medium">Project Location</div>
                  {projectLocation.label && (
                    <div className="text-xs text-muted-foreground">
                      {projectLocation.label}
                    </div>
                  )}
                </Popup>
              </Marker>

              {/* Dashed lines from project to each photo */}
              {geoPhotos.map((photo, i) => {
                const photoPos: [number, number] = [
                  Number(photo.latitude),
                  Number(photo.longitude),
                ];
                const projPos: [number, number] = [
                  projectLocation.latitude,
                  projectLocation.longitude,
                ];
                return (
                  <Polyline
                    key={`line-${photo.id}`}
                    positions={[projPos, photoPos]}
                    pathOptions={{
                      color: "#6366f1",
                      weight: 2,
                      dashArray: "6 4",
                      opacity: 0.6,
                    }}
                  >
                    <Tooltip sticky>{formatDistance(distances[i])}</Tooltip>
                  </Polyline>
                );
              })}
            </>
          )}
        </MapContainer>
      </div>

      {/* Distance summary */}
      {projectLocation && geoPhotos.length > 0 && (
        <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
          <span className="inline-block w-3 h-0.5 bg-indigo-500" />
          Total distance across {geoPhotos.length} photo
          {geoPhotos.length !== 1 ? "s" : ""}:{" "}
          <span className="font-medium text-foreground">
            {formatDistance(totalDistance)}
          </span>
        </div>
      )}
    </div>
  );
}

// Mini map for photo detail dialog
export function PhotoLocationMiniMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      className="h-full w-full"
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]} />
    </MapContainer>
  );
}
