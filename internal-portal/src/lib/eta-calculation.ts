// ETA Calculation Service
// Phase 12: ETA Calculation
// Calculates estimated time of arrival based on GPS coordinates and traffic patterns

interface ETACalculationInput {
  cleanerLat: number;
  cleanerLong: number;
  destinationLat: number;
  destinationLong: number;
  averageSpeed?: number; // km/h, default to 40km/h for urban areas
  trafficFactor?: number; // 1.0 = normal, 1.5 = heavy traffic
}

interface ETAResult {
  distanceKm: number;
  estimatedMinutes: number;
  estimatedArrivalTime: Date;
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number,
  long1: number,
  lat2: number,
  long2: number
): number {
  const R = 6371; // Earth's radius in km
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
 * Calculate estimated time of arrival
 */
export function calculateETA(input: ETACalculationInput): ETAResult {
  const {
    cleanerLat,
    cleanerLong,
    destinationLat,
    destinationLong,
    averageSpeed = 40, // Default urban speed
    trafficFactor = 1.0
  } = input;

  const factors: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'medium';

  // Calculate direct distance
  const distanceKm = calculateDistance(cleanerLat, cleanerLong, destinationLat, destinationLong);
  
  // Adjust for road network (typically 1.3x direct distance for urban areas)
  const roadDistance = distanceKm * 1.3;
  factors.push(`Road distance: ${roadDistance.toFixed(2)}km`);

  // Calculate base time in hours
  let timeHours = roadDistance / averageSpeed;

  // Apply traffic factor
  if (trafficFactor > 1.0) {
    timeHours *= trafficFactor;
    factors.push(`Traffic factor: ${trafficFactor}x`);
    confidence = 'low';
  }

  // Convert to minutes
  const estimatedMinutes = Math.round(timeHours * 60);

  // Calculate arrival time
  const estimatedArrivalTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);

  // Adjust confidence based on distance
  if (distanceKm < 1) {
    confidence = 'high';
    factors.push('Short distance - high accuracy');
  } else if (distanceKm > 10) {
    confidence = 'low';
    factors.push('Long distance - lower accuracy');
  }

  // Time of day adjustments
  const hour = new Date().getHours();
  if (hour >= 7 && hour <= 9) {
    timeHours *= 1.3; // Morning rush hour
    factors.push('Morning rush hour adjustment');
    confidence = 'low';
  } else if (hour >= 16 && hour <= 18) {
    timeHours *= 1.3; // Evening rush hour
    factors.push('Evening rush hour adjustment');
    confidence = 'low';
  } else if (hour >= 22 || hour <= 5) {
    timeHours *= 0.7; // Night time - faster
    factors.push('Night time - less traffic');
    confidence = 'high';
  }

  // Recalculate minutes with time adjustments
  const finalMinutes = Math.round(timeHours * 60);
  const finalArrivalTime = new Date(Date.now() + finalMinutes * 60 * 1000);

  return {
    distanceKm: roadDistance,
    estimatedMinutes: finalMinutes,
    estimatedArrivalTime: finalArrivalTime,
    confidence,
    factors
  };
}

/**
 * Format ETA for display
 */
export function formatETA(eta: ETAResult): string {
  const minutes = eta.estimatedMinutes;
  
  if (minutes < 1) {
    return 'Arriving now';
  } else if (minutes < 60) {
    return `Arriving in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `Arriving in ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `Arriving in ${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }
}

/**
 * Get ETA confidence level color
 */
export function getETAConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high': return 'text-green-600';
    case 'medium': return 'text-yellow-600';
    case 'low': return 'text-red-600';
  }
}

/**
 * Calculate ETA with historical data
 * This would use historical travel times between areas for better accuracy
 */
export async function calculateETAWithHistoricalData(
  input: ETACalculationInput,
  db: any
): Promise<ETAResult> {
  const baseETA = calculateETA(input);
  
  try {
    // Try to get historical average speed for this route
    // This would require a historical_travel_times table
    const historical = await db.prepare(
      `SELECT avg_speed_kmh, avg_time_minutes 
       FROM historical_travel_times 
       WHERE from_lat BETWEEN ? AND ? 
       AND from_long BETWEEN ? AND ?
       AND to_lat BETWEEN ? AND ?
       AND to_long BETWEEN ? AND ?
       ORDER BY ABS(from_lat - ?) + ABS(from_long - ?) ASC
       LIMIT 1`
    ).bind(
      input.cleanerLat - 0.01, input.cleanerLat + 0.01,
      input.cleanerLong - 0.01, input.cleanerLong + 0.01,
      input.destinationLat - 0.01, input.destinationLat + 0.01,
      input.destinationLong - 0.01, input.destinationLong + 0.01,
      input.cleanerLat, input.cleanerLong
    ).first();

    if (historical) {
      const historicalSpeed = (historical as any).avg_speed_kmh || input.averageSpeed;
      const historicalTime = (historical as any).avg_time_minutes;
      
      // Blend current calculation with historical data
      const blendedSpeed = (input.averageSpeed + historicalSpeed) / 2;
      const blendedETA = calculateETA({
        ...input,
        averageSpeed: blendedSpeed
      });
      
      blendedETA.factors.push('Historical data applied');
      blendedETA.confidence = 'high';
      
      return blendedETA;
    }
  } catch (error) {
    // Fall back to basic calculation if historical data unavailable
    console.warn('Historical ETA data unavailable, using basic calculation');
  }

  return baseETA;
}
