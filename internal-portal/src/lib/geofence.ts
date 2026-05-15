// Geofence Detection Logic
// Phase 5: Cleaner Status GPS Enhancement

export interface Geofence {
  id: number;
  name: string;
  center_lat: number;
  center_long: number;
  radius_meters: number;
  area_name: string;
  created_at: string;
}

export interface GeofenceResult {
  inside: boolean;
  distance: number;
  geofence: Geofence | null;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  long1: number,
  lat2: number,
  long2: number
): number {
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

/**
 * Check if a point is inside a geofence
 */
export function isInsideGeofence(
  lat: number,
  long: number,
  geofence: Geofence
): boolean {
  const distance = calculateDistance(
    lat,
    long,
    geofence.center_lat,
    geofence.center_long
  );
  return distance <= geofence.radius_meters;
}

/**
 * Check if a point is inside any geofence
 */
export function checkGeofences(
  lat: number,
  long: number,
  geofences: Geofence[]
): GeofenceResult {
  let closestDistance = Infinity;
  let closestGeofence: Geofence | null = null;

  for (const geofence of geofences) {
    const distance = calculateDistance(
      lat,
      long,
      geofence.center_lat,
      geofence.center_long
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestGeofence = geofence;
    }

    if (distance <= geofence.radius_meters) {
      return {
        inside: true,
        distance,
        geofence
      };
    }
  }

  return {
    inside: false,
    distance: closestDistance,
    geofence: closestGeofence
  };
}

/**
 * Create a geofence around a location
 * Default radius is 500 meters
 */
export function createGeofence(
  name: string,
  areaName: string,
  centerLat: number,
  centerLong: number,
  radiusMeters: number = 500
): Omit<Geofence, 'id' | 'created_at'> {
  return {
    name,
    area_name: areaName,
    center_lat: centerLat,
    center_long: centerLong,
    radius_meters: radiusMeters
  };
}

/**
 * Get GPS coordinates for a location name
 * This is a simplified version - in production, you'd use a geocoding API
 */
export function getCoordinatesForArea(areaName: string): { lat: number; long: number } | null {
  // Northern Suburbs coordinates (simplified)
  const areaCoordinates: Record<string, { lat: number; long: number }> = {
    'Durbanville': { lat: -33.8333, long: 18.6500 },
    'Bellville': { lat: -33.8986, long: 18.6319 },
    'Brackenfell': { lat: -33.8833, long: 18.7000 },
    'Plattekloof': { lat: -33.8667, long: 18.6167 },
    'Tygervalley': { lat: -33.8783, long: 18.6283 },
    'Parow': { lat: -33.9028, long: 18.5819 },
    'Goodwood': { lat: -33.9028, long: 18.5600 },
    'Kuils River': { lat: -33.9639, long: 18.7167 },
    'Kraaifontein': { lat: -33.9750, long: 18.7083 },
    'Stellenbosch': { lat: -33.9333, long: 18.8667 },
    'Paarl': { lat: -33.7333, long: 18.9667 },
    'Wellington': { lat: -33.6333, long: 18.9833 }
  };

  return areaCoordinates[areaName] || null;
}

/**
 * Auto-arrival detection
 * Check if cleaner has arrived at the booking location
 */
export function checkAutoArrival(
  cleanerLat: number,
  cleanerLong: number,
  bookingLocation: string,
  arrivalThresholdMeters: number = 100
): { arrived: boolean; distance: number; area: string | null } {
  const coords = getCoordinatesForArea(bookingLocation);
  
  if (!coords) {
    return {
      arrived: false,
      distance: Infinity,
      area: null
    };
  }

  const distance = calculateDistance(
    cleanerLat,
    cleanerLong,
    coords.lat,
    coords.long
  );

  return {
    arrived: distance <= arrivalThresholdMeters,
    distance,
    area: bookingLocation
  };
}

/**
 * Estimate ETA based on distance and average speed
 * Assumes average speed of 40 km/h in urban areas
 */
export function estimateETA(distanceMeters: number, avgSpeedKmh: number = 40): number {
  const speedMetersPerSecond = (avgSpeedKmh * 1000) / 3600;
  return distanceMeters / speedMetersPerSecond; // Returns seconds
}

/**
 * Format ETA in human-readable format
 */
export function formatETA(seconds: number): string {
  if (seconds < 60) {
    return 'Less than a minute';
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}
