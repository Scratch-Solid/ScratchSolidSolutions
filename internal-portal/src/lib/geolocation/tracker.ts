// Geolocation Tracking and Geofencing
// Phase 5: PWA Architecture & Geolocation Innovation

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  batteryLevel?: number;
  isCharging?: boolean;
}

export interface GeofenceArea {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

export class GeolocationTracker {
  private watchId: number | null = null;
  private locationQueue: LocationData[] = [];
  private isTracking: boolean = false;
  private geofences: Map<string, GeofenceArea> = new Map();
  private onGeofenceEnter?: (geofence: GeofenceArea) => void;
  private onGeofenceExit?: (geofence: GeofenceArea) => void;

  /**
   * Starts tracking location with adaptive sampling based on battery
   */
  startTracking(
    onLocationUpdate: (location: LocationData) => void,
    options?: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
    }
  ): void {
    if (this.isTracking) return;

    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };

          // Get battery info if available
          if ('getBattery' in navigator) {
            (navigator as any).getBattery().then((battery: any) => {
              locationData.batteryLevel = battery.level;
              locationData.isCharging = battery.charging;
            });
          }

          this.locationQueue.push(locationData);
          onLocationUpdate(locationData);
          this.checkGeofences(locationData);
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: options?.enableHighAccuracy || true,
          timeout: options?.timeout || 10000,
          maximumAge: options?.maximumAge || 0
        }
      );

      this.isTracking = true;
    }
  }

  /**
   * Stops tracking location
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
    }
  }

  /**
   * Adds a geofence area
   */
  addGeofence(geofence: GeofenceArea): void {
    this.geofences.set(geofence.id, geofence);
  }

  /**
   * Removes a geofence area
   */
  removeGeofence(id: string): void {
    this.geofences.delete(id);
  }

  /**
   * Sets geofence event handlers
   */
  setGeofenceHandlers(
    onEnter?: (geofence: GeofenceArea) => void,
    onExit?: (geofence: GeofenceArea) => void
  ): void {
    this.onGeofenceEnter = onEnter;
    this.onGeofenceExit = onExit;
  }

  /**
   * Checks if location is within a geofence
   */
  private checkGeofences(location: LocationData): void {
    for (const geofence of this.geofences.values()) {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        geofence.latitude,
        geofence.longitude
      );

      if (distance <= geofence.radius) {
        this.onGeofenceEnter?.(geofence);
      } else {
        this.onGeofenceExit?.(geofence);
      }
    }
  }

  /**
   * Calculates distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Gets adaptive sampling interval based on battery
   */
  getAdaptiveSamplingInterval(batteryLevel: number, isCharging: boolean): number {
    if (isCharging) {
      return 5000; // 5 seconds when charging
    }

    if (batteryLevel > 0.5) {
      return 10000; // 10 seconds when battery > 50%
    }

    if (batteryLevel > 0.2) {
      return 30000; // 30 seconds when battery > 20%
    }

    return 60000; // 60 seconds when battery <= 20%
  }

  /**
   * Gets queued locations
   */
  getQueuedLocations(): LocationData[] {
    return [...this.locationQueue];
  }

  /**
   * Clears queued locations
   */
  clearQueuedLocations(): void {
    this.locationQueue = [];
  }

  /**
   * Syncs queued locations to server
   */
  async syncLocations(apiUrl: string): Promise<void> {
    if (this.locationQueue.length === 0) return;

    try {
      const response = await fetch(`${apiUrl}/api/v1/location/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ locations: this.locationQueue })
      });

      if (response.ok) {
        this.clearQueuedLocations();
      }
    } catch (error) {
      console.error('Failed to sync locations:', error);
    }
  }
}

// Singleton instance
export const geolocationTracker = new GeolocationTracker();
