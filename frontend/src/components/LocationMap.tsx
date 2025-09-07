"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { LatLngExpression } from "leaflet";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);


const defaultCenter: LatLngExpression = [28.6139, 77.2090]; // Delhi

interface LocationMapProps {
  lat?: number;
  lng?: number;
  onLocationChange: (lat: number, lng: number) => void;
}

const LocationMap: React.FC<LocationMapProps> = ({ lat, lng, onLocationChange }) => {
  const [position, setPosition] = useState<LatLngExpression>(
    lat && lng ? [lat, lng] : defaultCenter
  );
  const [isClient, setIsClient] = useState(false);
  const [L, setL] = useState<any>(null);
  const markerRef = useRef<any>(null);

  // Initialize Leaflet only on client side
  useEffect(() => {
    setIsClient(true);
    import("leaflet").then((leaflet) => {
      setL(leaflet.default);
      
      // Fix for default marker icons in Leaflet with Next.js
      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl;
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    });
  }, []);

  // Handle marker drag
  const onDragEnd = useCallback(() => {
    const marker = markerRef.current;
    if (marker != null && L) {
      const latlng = marker.getLatLng();
      const newPosition: LatLngExpression = [latlng.lat, latlng.lng];
      setPosition(newPosition);
      onLocationChange(latlng.lat, latlng.lng);
      
    }
  }, [onLocationChange, L]);

  // Handle map click
  const handleMapClick = useCallback((e: any) => {
    if (L) {
      const newPosition: LatLngExpression = [e.latlng.lat, e.latlng.lng];
      setPosition(newPosition);
      onLocationChange(e.latlng.lat, e.latlng.lng);
    }
  }, [onLocationChange, L]);


  const center = lat && lng ? [lat, lng] as LatLngExpression : defaultCenter;

  // Show loading state while client-side code initializes
  if (!isClient || !L) {
    return (
      <div className="space-y-3">
        <label className="block text-lg font-medium text-foreground">Event Location</label>
        <div className="rounded-xl border border-foreground/10 overflow-hidden bg-foreground/5">
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-foreground/60">Loading map...</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-foreground/60">
          Click on the map or drag the marker to set the event location
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-lg font-medium text-foreground">Event Location</label>
      <div className="rounded-xl border border-foreground/10 overflow-hidden bg-foreground/5">
        <MapContainer 
          center={center} 
          zoom={13} 
          style={{ height: "320px", width: "100%" }}
          onClick={handleMapClick}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* Draggable Marker */}
          <Marker
            draggable={true}
            eventHandlers={{ dragend: onDragEnd }}
            position={position}
            ref={markerRef}
          >
            <Popup>
              <div>
                <b>Lat:</b> {(position as number[])[0].toFixed(6)} <br />
                <b>Lng:</b> {(position as number[])[1].toFixed(6)}
              </div>
            </Popup>
          </Marker>

        </MapContainer>
      </div>
      
      <p className="text-sm text-foreground/60">
        Click on the map or drag the marker to set the event location
      </p>
    </div>
  );
};

export default LocationMap;
