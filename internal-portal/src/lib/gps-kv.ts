// GPS KV Storage Service
// Phase 5: Cleaner Status GPS Enhancement
// Store real-time GPS coordinates in Cloudflare KV

export interface GPSCoordinates {
  lat: number;
  long: number;
  timestamp: number;
  cleanerId: number;
  bookingId?: number;
  status: 'idle' | 'on_way' | 'arrived' | 'completed';
}

export interface CleanerLocation {
  cleanerId: number;
  lat: number;
  long: number;
  timestamp: number;
  status: string;
  bookingId?: number;
}

/**
 * Store GPS coordinates in KV
 * Key format: gps:{cleanerId}
 */
export async function storeGPSCoordinates(
  env: any,
  cleanerId: number,
  lat: number,
  long: number,
  status: 'idle' | 'on_way' | 'arrived' | 'completed',
  bookingId?: number
): Promise<boolean> {
  try {
    if (!env.GPS_KV) {
      console.error('GPS_KV binding not available');
      return false;
    }

    const data: GPSCoordinates = {
      lat,
      long,
      timestamp: Date.now(),
      cleanerId,
      bookingId,
      status
    };

    const key = `gps:${cleanerId}`;
    await env.GPS_KV.put(key, JSON.stringify(data), {
      expirationTtl: 3600 // Expire after 1 hour
    });

    // Also store in location list for tracking multiple cleaners
    const locationListKey = `cleaner_locations`;
    let locations: CleanerLocation[] = [];
    const existingLocations = await env.GPS_KV.get(locationListKey, 'json');
    
    if (existingLocations) {
      locations = existingLocations as CleanerLocation[];
      // Update existing cleaner location or add new one
      const existingIndex = locations.findIndex(l => l.cleanerId === cleanerId);
      if (existingIndex >= 0) {
        locations[existingIndex] = {
          cleanerId,
          lat,
          long,
          timestamp: Date.now(),
          status,
          bookingId
        };
      } else {
        locations.push({
          cleanerId,
          lat,
          long,
          timestamp: Date.now(),
          status,
          bookingId
        });
      }
    } else {
      locations.push({
        cleanerId,
        lat,
        long,
        timestamp: Date.now(),
        status,
        bookingId
      });
    }

    // Keep only last 100 locations to prevent KV from growing too large
    if (locations.length > 100) {
      locations = locations.slice(-100);
    }

    await env.GPS_KV.put(locationListKey, JSON.stringify(locations), {
      expirationTtl: 3600
    });

    return true;
  } catch (error) {
    console.error('Error storing GPS coordinates:', error);
    return false;
  }
}

/**
 * Get GPS coordinates for a specific cleaner
 */
export async function getGPSCoordinates(
  env: any,
  cleanerId: number
): Promise<GPSCoordinates | null> {
  try {
    if (!env.GPS_KV) {
      console.error('GPS_KV binding not available');
      return null;
    }

    const key = `gps:${cleanerId}`;
    const data = await env.GPS_KV.get(key, 'json');
    
    return data as GPSCoordinates | null;
  } catch (error) {
    console.error('Error getting GPS coordinates:', error);
    return null;
  }
}

/**
 * Get all cleaner locations
 */
export async function getAllCleanerLocations(
  env: any
): Promise<CleanerLocation[]> {
  try {
    if (!env.GPS_KV) {
      console.error('GPS_KV binding not available');
      return [];
    }

    const locationListKey = `cleaner_locations`;
    const data = await env.GPS_KV.get(locationListKey, 'json');
    
    return (data as CleanerLocation[]) || [];
  } catch (error) {
    console.error('Error getting all cleaner locations:', error);
    return [];
  }
}

/**
 * Get cleaner location for a specific booking
 */
export async function getCleanerLocationForBooking(
  env: any,
  bookingId: number
): Promise<CleanerLocation | null> {
  try {
    const locations = await getAllCleanerLocations(env);
    return locations.find(l => l.bookingId === bookingId) || null;
  } catch (error) {
    console.error('Error getting cleaner location for booking:', error);
    return null;
  }
}

/**
 * Remove GPS coordinates for a cleaner
 */
export async function removeGPSCoordinates(
  env: any,
  cleanerId: number
): Promise<boolean> {
  try {
    if (!env.GPS_KV) {
      console.error('GPS_KV binding not available');
      return false;
    }

    const key = `gps:${cleanerId}`;
    await env.GPS_KV.delete(key);

    // Also remove from location list
    const locationListKey = `cleaner_locations`;
    let locations: CleanerLocation[] = [];
    const existingLocations = await env.GPS_KV.get(locationListKey, 'json');
    
    if (existingLocations) {
      locations = existingLocations as CleanerLocation[];
      locations = locations.filter(l => l.cleanerId !== cleanerId);
      
      if (locations.length > 0) {
        await env.GPS_KV.put(locationListKey, JSON.stringify(locations), {
          expirationTtl: 3600
        });
      } else {
        await env.GPS_KV.delete(locationListKey);
      }
    }

    return true;
  } catch (error) {
    console.error('Error removing GPS coordinates:', error);
    return false;
  }
}

/**
 * Store push notification token
 * Key format: push:{cleanerId}
 */
export async function storePushToken(
  env: any,
  cleanerId: number,
  token: string
): Promise<boolean> {
  try {
    if (!env.PUSH_KV) {
      console.error('PUSH_KV binding not available');
      return false;
    }

    const key = `push:${cleanerId}`;
    await env.PUSH_KV.put(key, token, {
      expirationTtl: 86400 * 30 // Expire after 30 days
    });

    return true;
  } catch (error) {
    console.error('Error storing push token:', error);
    return false;
  }
}

/**
 * Get push notification token for a cleaner
 */
export async function getPushToken(
  env: any,
  cleanerId: number
): Promise<string | null> {
  try {
    if (!env.PUSH_KV) {
      console.error('PUSH_KV binding not available');
      return null;
    }

    const key = `push:${cleanerId}`;
    const token = await env.PUSH_KV.get(key);
    
    return token || null;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}
