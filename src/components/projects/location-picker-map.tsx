"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCurrentPosition, reverseGeocode } from "@/lib/geo-utils";
import type { ReverseGeoResult } from "@/lib/geo-utils";

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

const LAGOS_CENTER: [number, number] = [6.5244, 3.3792];

interface LocationPickerMapProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (
    lat: number,
    lng: number,
    address?: ReverseGeoResult | null,
  ) => void;
}

function MapClickHandler({
  onLocationSelect,
  setPosition,
}: {
  onLocationSelect: (
    lat: number,
    lng: number,
    address?: ReverseGeoResult | null,
  ) => void;
  setPosition: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      reverseGeocode(lat, lng).then((addr) => onLocationSelect(lat, lng, addr));
    },
  });
  return null;
}

function CenterOnLoad({
  initialLat,
  initialLng,
  setPosition,
  onLocationSelect,
}: {
  initialLat?: number;
  initialLng?: number;
  setPosition: (pos: [number, number]) => void;
  onLocationSelect: (
    lat: number,
    lng: number,
    address?: ReverseGeoResult | null,
  ) => void;
}) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (initialLat !== undefined && initialLng !== undefined) {
      map.setView([initialLat, initialLng], 15);
      return;
    }

    getCurrentPosition().then((pos) => {
      if (pos) {
        map.setView([pos.latitude, pos.longitude], 15);
        setPosition([pos.latitude, pos.longitude]);
        reverseGeocode(pos.latitude, pos.longitude).then((addr) =>
          onLocationSelect(pos.latitude, pos.longitude, addr),
        );
      }
    });
  }, [map, initialLat, initialLng, setPosition, onLocationSelect]);

  return null;
}

export function LocationPickerMap({
  initialLat,
  initialLng,
  onLocationSelect,
}: LocationPickerMapProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat !== undefined && initialLng !== undefined
      ? [initialLat, initialLng]
      : null,
  );

  const center: [number, number] =
    initialLat !== undefined && initialLng !== undefined
      ? [initialLat, initialLng]
      : LAGOS_CENTER;

  return (
    <MapContainer center={center} zoom={13} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CenterOnLoad
        initialLat={initialLat}
        initialLng={initialLng}
        setPosition={setPosition}
        onLocationSelect={onLocationSelect}
      />
      <MapClickHandler
        onLocationSelect={onLocationSelect}
        setPosition={setPosition}
      />
      {position && (
        <Marker
          position={position}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const pos = marker.getLatLng();
              setPosition([pos.lat, pos.lng]);
              reverseGeocode(pos.lat, pos.lng).then((addr) =>
                onLocationSelect(pos.lat, pos.lng, addr),
              );
            },
          }}
        />
      )}
    </MapContainer>
  );
}
