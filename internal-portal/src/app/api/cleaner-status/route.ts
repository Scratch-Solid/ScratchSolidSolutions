export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { storeGPSCoordinates } from '@/lib/gps-kv';
import { isInsideGeofence, checkAutoArrival } from '@/lib/geofence';

const VALID_STATUSES = ['idle', 'on_way', 'arrived', 'completed'];

export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const env = (authResult as any).env;

  try {
    const body = await request.json() as {
      cleaner_id?: number;
      status?: string;
      gps_lat?: number;
      gps_long?: number;
      booking_id?: number;
      battery_level?: number;
    };
    const { cleaner_id, status, gps_lat, gps_long, booking_id, battery_level } = body;

    if (!cleaner_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Check if cleaner is blocked
    const cleaner = await db.prepare('SELECT blocked FROM cleaner_profiles WHERE user_id = ?').bind(cleaner_id).first();
    if (!cleaner) {
      return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 });
    }
    if (cleaner.blocked === 1) {
      return NextResponse.json({ error: 'Cleaner account is blocked' }, { status: 403 });
    }

    // Validate status transitions
    const currentStatus = await db.prepare('SELECT status FROM cleaner_profiles WHERE user_id = ?').bind(cleaner_id).first() as any;
    const validTransition = validateStatusTransition(currentStatus?.status || 'idle', status);
    if (!validTransition) {
      const response = NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Update cleaner status and GPS coordinates
    const updates = ['status = ?', 'updated_at = datetime(\'now\')'];
    const values: any[] = [status];
    if (gps_lat !== undefined) {
      updates.push('gps_lat = ?');
      values.push(String(gps_lat));
    }
    if (gps_long !== undefined) {
      updates.push('gps_long = ?');
      values.push(String(gps_long));
    }
    if (battery_level !== undefined) {
      updates.push('battery_level = ?');
      updates.push('last_battery_check = datetime(\'now\')');
      values.push(battery_level);
    }
    values.push(String(cleaner_id));

    await db.prepare(
      `UPDATE cleaner_profiles SET ${updates.join(', ')} WHERE user_id = ?`
    ).bind(...values).run();

    // Update booking GPS tracking if booking_id is provided
    if (booking_id && (gps_lat !== undefined || gps_long !== undefined)) {
      const bookingUpdates = [];
      const bookingValues = [];
      
      if (gps_lat !== undefined) {
        bookingUpdates.push('gps_lat = ?');
        bookingValues.push(gps_lat);
      }
      if (gps_long !== undefined) {
        bookingUpdates.push('gps_long = ?');
        bookingValues.push(gps_long);
      }
      bookingUpdates.push('last_location_update = datetime(\'now\')');
      bookingValues.push(booking_id);

      if (bookingUpdates.length > 0) {
        await db.prepare(
          `UPDATE bookings SET ${bookingUpdates.join(', ')} WHERE id = ?`
        ).bind(...bookingValues).run();
      }
    }

    // Store GPS coordinates in KV for real-time tracking
    if (gps_lat !== undefined && gps_long !== undefined) {
      await storeGPSCoordinates(
        env,
        cleaner_id,
        gps_lat,
        gps_long,
        status as 'idle' | 'on_way' | 'arrived' | 'completed',
        booking_id
      );

      // Geofencing for auto-arrival detection
      if (status === 'on_way' && booking_id) {
        const booking = await db.prepare('SELECT location FROM bookings WHERE id = ?').bind(booking_id).first() as any;
        if (booking && booking.location) {
          // Check if cleaner has arrived at the booking location
          const arrivalCheck = checkAutoArrival(gps_lat, gps_long, booking.location, 100); // 100m threshold
          
          if (arrivalCheck.arrived) {
            // Auto-update status to arrived
            logger.info(`Auto-arrival detected for cleaner ${cleaner_id} at booking ${booking_id}, distance: ${arrivalCheck.distance}m`);
            
            await db.prepare(
              'UPDATE cleaner_profiles SET status = ?, updated_at = datetime(\'now\') WHERE user_id = ?'
            ).bind('arrived', cleaner_id).run();
            
            // Update KV with new status
            await storeGPSCoordinates(
              env,
              cleaner_id,
              gps_lat,
              gps_long,
              'arrived',
              booking_id
            );
          }
        }
      }
    }

    // Auto-calculate adherence score on ARRIVED transition
    if (status === 'arrived') {
      try {
        const today = new Date().toISOString().split('T')[0];
        const assignment = await db.prepare(`
          SELECT ba.id, ba.booking_id, b.booking_time AS time_slot
          FROM booking_assignments ba
          JOIN bookings b ON b.id = ba.booking_id
          WHERE ba.staff_id = ?
            AND b.booking_date = ?
            AND ba.assignment_status NOT IN ('completed', 'cancelled')
          ORDER BY b.booking_time ASC
          LIMIT 1
        `).bind(cleaner_id, today).first() as any;

        if (assignment?.time_slot) {
          const now = new Date();
          const actualTime = now.toTimeString().substring(0, 5); // HH:MM
          const scheduledTime = assignment.time_slot; // e.g. "08:00"

          // Calculate minutes difference (negative = early, positive = late)
          const [sH, sM] = scheduledTime.split(':').map(Number);
          const [aH, aM] = actualTime.split(':').map(Number);
          const diffMinutes = (aH * 60 + aM) - (sH * 60 + sM);

          // Score: 10 = on time or early, decreasing by 1 per 5 minutes late, min 0
          const adherenceScore = Math.max(0, Math.min(10, 10 - Math.floor(Math.max(0, diffMinutes) / 5)));

          // Insert adherence record into job_performance_metrics
          await db.prepare(`
            INSERT INTO job_performance_metrics
              (staff_id, booking_id, scheduled_time, actual_arrival_time, adherence_score, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `).bind(String(cleaner_id), String(assignment.booking_id), scheduledTime, actualTime, adherenceScore).run();

          logger.info(`Adherence scored ${adherenceScore}/10 for cleaner ${cleaner_id} (${diffMinutes > 0 ? diffMinutes + ' min late' : 'on time'})`);
        }
      } catch (adherenceErr) {
        logger.warn('Adherence calculation failed', adherenceErr);
      }
    }

    // Battery level alerts
    if (battery_level !== undefined && battery_level <= 20) {
      const alertType = battery_level <= 10 ? 'critical' : 'low';
      
      // Check if alert already sent in the last hour
      const recentAlert = await db.prepare(
        `SELECT * FROM battery_alerts 
         WHERE cleaner_id = ? AND alert_type = ? 
         AND sent_at > datetime('now', '-1 hour')`
      ).bind(cleaner_id, alertType).first();

      if (!recentAlert) {
        // Send battery alert
        await db.prepare(
          `INSERT INTO battery_alerts (cleaner_id, battery_level, alert_type, sent_at)
           VALUES (?, ?, ?, datetime('now'))`
        ).bind(cleaner_id, battery_level, alertType).run();

        logger.warn(`Battery ${alertType} alert for cleaner ${cleaner_id}: ${battery_level}%`);
        
        // TODO: Send notification to cleaner via WhatsApp/SMS
        // TODO: Send notification to admin if critical
      }
    }

    const response = NextResponse.json({ success: true, status });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to update cleaner status' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const cleanerId = searchParams.get('cleaner_id');

    if (!cleanerId) {
      return NextResponse.json({ error: 'Missing cleaner_id' }, { status: 400 });
    }

    const cleaner = await db.prepare('SELECT status, gps_lat, gps_long, blocked FROM cleaner_profiles WHERE user_id = ?').bind(cleanerId).first();
    
    if (!cleaner) {
      return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 });
    }

    const response = NextResponse.json(cleaner);
    response.headers.set('Cache-Control', 'private, max-age=10');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to fetch cleaner status' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

function validateStatusTransition(current: string, next: string): boolean {
  const transitions: Record<string, string[]> = {
    'idle': ['on_way'],
    'on_way': ['arrived', 'idle'],
    'arrived': ['completed', 'on_way'],
    'completed': ['idle']
  };
  
  return transitions[current]?.includes(next) || false;
}
