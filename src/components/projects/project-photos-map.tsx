"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ProjectPhoto } from "@/hooks/projects/use-project-photos";
import { Badge } from "@/components/ui/badge";

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

interface ProjectPhotosMapProps {
  photos: ProjectPhoto[];
  onPhotoClick: (photo: ProjectPhoto) => void;
}

function FitBounds({ photos }: { photos: ProjectPhoto[] }) {
  const map = useMap();

  useEffect(() => {
    const geoPhotos = photos.filter((p) => p.latitude && p.longitude);
    if (geoPhotos.length === 0) return;

    const bounds = L.latLngBounds(
      geoPhotos.map(
        (p) => [Number(p.latitude), Number(p.longitude)] as [number, number],
      ),
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [photos, map]);

  return null;
}

export function ProjectPhotosMap({
  photos,
  onPhotoClick,
}: ProjectPhotosMapProps) {
  const geoPhotos = photos.filter((p) => p.latitude && p.longitude);

  if (geoPhotos.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/10 border-dashed">
        <p className="text-muted-foreground">
          No photos with GPS data to display on the map
        </p>
      </div>
    );
  }

  const center: [number, number] = [
    Number(geoPhotos[0].latitude),
    Number(geoPhotos[0].longitude),
  ];

  return (
    <div className="h-[500px] rounded-lg overflow-hidden border">
      <MapContainer center={center} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds photos={geoPhotos} />
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
        >
          {geoPhotos.map((photo) => (
            <Marker
              key={photo.id}
              position={[Number(photo.latitude), Number(photo.longitude)]}
            >
              <Popup>
                <div className="w-48">
                  <img
                    src={photo.fileUrl}
                    alt={photo.note || photo.fileName}
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
      </MapContainer>
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
