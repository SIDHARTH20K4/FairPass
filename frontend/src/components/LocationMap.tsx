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

// Location coordinates mapping
const LOCATION_COORDINATES: { [key: string]: [number, number] } = {
  "Singapore": [1.3521, 103.8198],
  "Mumbai": [19.0760, 72.8777],
  "Bengaluru": [12.9716, 77.5946],
  "Delhi": [28.6139, 77.2090],
  "Jakarta": [-6.2088, 106.8456],
  "Seoul": [37.5665, 126.9780],
  "Tokyo": [35.6762, 139.6503],
  "Sydney": [-33.8688, 151.2093],
  "Taipei": [25.0330, 121.5654],
  "Dubai": [25.2048, 55.2708],
  "London": [51.5074, -0.1278],
  "Paris": [48.8566, 2.3522],
  "Berlin": [52.5200, 13.4050],
  "Lisbon": [38.7223, -9.1393],
  "Amsterdam": [52.3676, 4.9041],
  "San Francisco": [37.7749, -122.4194],
  "New York": [40.7128, -74.0060],
  "Toronto": [43.6532, -79.3832],
  "Austin": [30.2672, -97.7431],
  "Buenos Aires": [-34.6118, -58.3960],
  "São Paulo": [-23.5505, -46.6333],
  "Cape Town": [-33.9249, 18.4241],
  "Nairobi": [-1.2921, 36.8219],
  "Worldwide": [0, 0], // Default center for worldwide
};

interface LocationMapProps {
  lat?: number;
  lng?: number;
  selectedLocation?: string;
  onLocationChange: (lat: number, lng: number) => void;
}

const LocationMap: React.FC<LocationMapProps> = ({ lat, lng, selectedLocation, onLocationChange }) => {
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

  // Update map center when selected location changes
  useEffect(() => {
    if (selectedLocation && LOCATION_COORDINATES[selectedLocation]) {
      const newCenter = LOCATION_COORDINATES[selectedLocation];
      setPosition(newCenter);
      onLocationChange(newCenter[0], newCenter[1]);
    }
  }, [selectedLocation, onLocationChange]);

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


  // Calculate center based on selected location or provided coordinates
  const getCenter = (): LatLngExpression => {
    if (lat && lng) {
      return [lat, lng] as LatLngExpression;
    }
    if (selectedLocation && LOCATION_COORDINATES[selectedLocation]) {
      return LOCATION_COORDINATES[selectedLocation];
    }
    return defaultCenter;
  };

  const center = getCenter();

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
          key={selectedLocation || 'default'}
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
