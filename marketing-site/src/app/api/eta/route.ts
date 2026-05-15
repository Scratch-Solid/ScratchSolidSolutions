import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const cleanerLat = parseFloat(searchParams.get('cleaner_lat') || '0');
    const cleanerLong = parseFloat(searchParams.get('cleaner_long') || '0');
    const destinationLat = parseFloat(searchParams.get('destination_lat') || '0');
    const destinationLong = parseFloat(searchParams.get('destination_long') || '0');
    const averageSpeed = parseFloat(searchParams.get('average_speed') || '40');
    const trafficFactor = parseFloat(searchParams.get('traffic_factor') || '1.0');

    if (!cleanerLat || !cleanerLong || !destinationLat || !destinationLong) {
      const response = NextResponse.json({ error: 'Missing required GPS coordinates' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Calculate ETA using inline implementation
    const eta = calculateETA({
      cleanerLat,
      cleanerLong,
      destinationLat,
      destinationLong,
      averageSpeed,
      trafficFactor
    });

    const response = NextResponse.json({
      ...eta,
      formatted: formatETA(eta)
    });
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error calculating ETA', error as Error);
    const response = NextResponse.json({ error: 'Failed to calculate ETA' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

// Inline ETA calculation to avoid cross-project import issues
function calculateDistance(lat1: number, long1: number, lat2: number, long2: number): number {
  const R = 6371;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((long2 - long1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateETA(input: any) {
  const { cleanerLat, cleanerLong, destinationLat, destinationLong, averageSpeed = 40, trafficFactor = 1.0 } = input;
  const factors: string[] = [];
  let confidence = 'medium';
  const distanceKm = calculateDistance(cleanerLat, cleanerLong, destinationLat, destinationLong);
  const roadDistance = distanceKm * 1.3;
  factors.push(`Road distance: ${roadDistance.toFixed(2)}km`);
  let timeHours = roadDistance / averageSpeed;
  if (trafficFactor > 1.0) {
    timeHours *= trafficFactor;
    factors.push(`Traffic factor: ${trafficFactor}x`);
    confidence = 'low';
  }
  const estimatedMinutes = Math.round(timeHours * 60);
  const estimatedArrivalTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);
  if (distanceKm < 1) {
    confidence = 'high';
    factors.push('Short distance - high accuracy');
  } else if (distanceKm > 10) {
    confidence = 'low';
    factors.push('Long distance - lower accuracy');
  }
  const hour = new Date().getHours();
  if (hour >= 7 && hour <= 9) {
    timeHours *= 1.3;
    factors.push('Morning rush hour adjustment');
    confidence = 'low';
  } else if (hour >= 16 && hour <= 18) {
    timeHours *= 1.3;
    factors.push('Evening rush hour adjustment');
    confidence = 'low';
  } else if (hour >= 22 || hour <= 5) {
    timeHours *= 0.7;
    factors.push('Night time - less traffic');
    confidence = 'high';
  }
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

function formatETA(eta: any): string {
  const minutes = eta.estimatedMinutes;
  if (minutes < 1) return 'Arriving now';
  if (minutes < 60) return `Arriving in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `Arriving in ${hours} hour${hours !== 1 ? 's' : ''}`;
  return `Arriving in ${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}
