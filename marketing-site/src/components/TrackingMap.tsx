"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in React Leaflet
const customIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const cleanerIcon = L.divIcon({
  html: '<div style="background-color: #3B82F6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const destinationIcon = L.divIcon({
  html: '<div style="background-color: #EF4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

interface TrackingMapProps {
  cleanerLat?: number;
  cleanerLong?: number;
  destinationLat?: number;
  destinationLong?: number;
  locationName?: string;
  showRoute?: boolean;
  height?: string;
}

export default function TrackingMap({
  cleanerLat,
  cleanerLong,
  destinationLat,
  destinationLong,
  locationName = 'Destination',
  showRoute = false,
  height = '400px'
}: TrackingMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div 
        style={{ height }} 
        className="bg-gray-100 rounded-xl flex items-center justify-center"
      >
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  // Calculate center point between cleaner and destination
  const centerLat = cleanerLat && destinationLat 
    ? (cleanerLat + destinationLat) / 2 
    : cleanerLat || destinationLat || -33.9249; // Default to Cape Town
  const centerLong = cleanerLong && destinationLong 
    ? (cleanerLong + destinationLong) / 2 
    : cleanerLong || destinationLong || 18.4241; // Default to Cape Town

  return (
    <MapContainer
      center={[centerLat, centerLong]}
      zoom={13}
      style={{ height, width: '100%' }}
      className="rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Cleaner marker */}
      {cleanerLat && cleanerLong && (
        <>
          <Marker position={[cleanerLat, cleanerLong]} icon={cleanerIcon}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">🧹 Cleaner Location</div>
                <div className="text-gray-600">
                  Lat: {cleanerLat.toFixed(6)}<br />
                  Long: {cleanerLong.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
          
          {/* Accuracy circle */}
          <Circle 
            center={[cleanerLat, cleanerLong]} 
            radius={100} 
            pathOptions={{ 
              color: '#3B82F6', 
              fillColor: '#3B82F6', 
              fillOpacity: 0.1,
              weight: 2 
            }}
          />
        </>
      )}

      {/* Destination marker */}
      {destinationLat && destinationLong && (
        <Marker position={[destinationLat, destinationLong]} icon={destinationIcon}>
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">🏠 {locationName}</div>
              <div className="text-gray-600">
                Lat: {destinationLat.toFixed(6)}<br />
                Long: {destinationLong.toFixed(6)}
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Route line (simplified - straight line) */}
      {showRoute && cleanerLat && cleanerLong && destinationLat && destinationLong && (
        <>
          <Circle 
            center={[cleanerLat, cleanerLong]} 
            radius={calculateDistance(cleanerLat, cleanerLong, destinationLat, destinationLong)}
            pathOptions={{ 
              color: '#10B981', 
              fillColor: '#10B981', 
              fillOpacity: 0.05,
              weight: 1,
              dashArray: '10, 10'
            }}
          />
        </>
      )}
    </MapContainer>
  );
}

// Helper function to calculate distance in meters
function calculateDistance(lat1: number, long1: number, lat2: number, long2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((long2 - long1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
