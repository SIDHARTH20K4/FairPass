import React, { useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";

// Fix for default marker icons in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
  const [route, setRoute] = useState<LatLngExpression[]>([]);
  const markerRef = useRef<L.Marker<any>>(null);

  // Handle marker drag
  const onDragEnd = useCallback(() => {
    const marker = markerRef.current;
    if (marker != null) {
      const latlng = marker.getLatLng();
      const newPosition: LatLngExpression = [latlng.lat, latlng.lng];
      setPosition(newPosition);
      onLocationChange(latlng.lat, latlng.lng);
      console.log("Dragged to:", latlng);
    }
  }, [onLocationChange]);

  // Handle map click
  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    const newPosition: LatLngExpression = [e.latlng.lat, e.latlng.lng];
    setPosition(newPosition);
    onLocationChange(e.latlng.lat, e.latlng.lng);
  }, [onLocationChange]);

  // Get directions (using OSRM)
  const getDirections = async () => {
    const start = `${(defaultCenter as number[])[1]},${(defaultCenter as number[])[0]}`;
    const end = `${(position as number[])[1]},${(position as number[])[0]}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        setRoute(coords);
      }
    } catch (error) {
      console.error("Error fetching directions:", error);
    }
  };

  const center = lat && lng ? [lat, lng] as LatLngExpression : defaultCenter;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Event Location</label>
      <div className="rounded-md border border-black/10 dark:border-white/10 overflow-hidden">
        <MapContainer 
          center={center} 
          zoom={13} 
          style={{ height: "300px", width: "100%" }}
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

          {/* Show route */}
          {route.length > 0 && <Polyline positions={route} color="blue" />}
        </MapContainer>
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Click on the map or drag the marker to set the event location
        </p>
        <button
          onClick={getDirections}
          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Get Directions
        </button>
      </div>
      
      <div className="text-xs text-gray-400">
        Coordinates: {(position as number[])[0].toFixed(6)}, {(position as number[])[1].toFixed(6)}
      </div>
    </div>
  );
};

export default LocationMap;
