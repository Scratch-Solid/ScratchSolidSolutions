export interface GeolocationData {
  ip: string;
  country?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export async function getGeolocation(ip: string): Promise<GeolocationData> {
  try {
    // Use a free IP geolocation service
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      throw new Error('Geolocation service unavailable');
    }

    const data: any = await response.json();
    
    return {
      ip: ip,
      country: data.country_name,
      city: data.city,
      region: data.region,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone
    };
  } catch (error) {
    console.error('Failed to get geolocation:', error);
    return { ip };
  }
}

export function detectSuspiciousLocationChange(
  currentLocation: GeolocationData,
  previousLocations: GeolocationData[],
  timeThreshold: number = 3600000 // 1 hour in milliseconds
): boolean {
  if (previousLocations.length === 0) {
    return false;
  }

  const recentLocations = previousLocations.filter(
    loc => Date.now() - new Date(loc.ip as any).getTime() < timeThreshold
  );

  // Check if location changed significantly within the time threshold
  for (const prev of recentLocations) {
    if (prev.latitude && prev.longitude && 
        currentLocation.latitude && currentLocation.longitude) {
      
      const distance = calculateDistance(
        prev.latitude,
        prev.longitude,
        currentLocation.latitude,
        currentLocation.longitude
      );

      // If location changed more than 500km within 1 hour, flag as suspicious
      if (distance > 500) {
        return true;
      }
    }

    // If country changed significantly, flag as suspicious
    if (prev.country !== currentLocation.country) {
      return true;
    }
  }

  return false;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  
  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
