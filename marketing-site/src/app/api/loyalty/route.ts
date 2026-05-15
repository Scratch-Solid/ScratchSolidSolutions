import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const userId = (user as any).id;

    // Get loyalty points
    const loyalty = await db.prepare(
      'SELECT points, tier FROM loyalty_points WHERE user_id = ?'
    ).bind(userId).first();

    // Get recent transactions
    const transactions = await db.prepare(
      `SELECT * FROM loyalty_transactions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 10`
    ).bind(userId).all();

    const response = NextResponse.json({
      points: loyalty?.points || 0,
      tier: loyalty?.tier || 'bronze',
      recent_transactions: transactions.results || []
    });
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching loyalty data', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch loyalty data' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json() as {
      user_id?: number;
      points?: number;
      transaction_type?: string;
      description?: string;
      booking_id?: number;
    };
    const { user_id, points, transaction_type, description, booking_id } = body;

    if (!user_id || !points || !transaction_type) {
      const response = NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Add transaction
    await db.prepare(
      `INSERT INTO loyalty_transactions (user_id, points, transaction_type, description, booking_id, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(user_id, points, transaction_type, description || '', booking_id || null).run();

    // Update total points
    const existing = await db.prepare('SELECT points FROM loyalty_points WHERE user_id = ?').bind(user_id).first();
    
    if (existing) {
      const newPoints = (existing as any).points + points;
      await db.prepare('UPDATE loyalty_points SET points = ? WHERE user_id = ?').bind(newPoints, user_id).run();
      
      // Update tier based on points
      const newTier = getTierForPoints(newPoints);
      await db.prepare('UPDATE loyalty_points SET tier = ? WHERE user_id = ?').bind(newTier, user_id).run();
    } else {
      const newTier = getTierForPoints(points);
      await db.prepare(
        `INSERT INTO loyalty_points (user_id, points, tier, earned_at, expires_at)
         VALUES (?, ?, ?, datetime('now'), datetime('now', '+1 year'))`
      ).bind(user_id, points, newTier).run();
    }

    logger.info(`Loyalty points ${points > 0 ? 'added' : 'deducted'} for user ${user_id}`);

    const response = NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error updating loyalty points', error as Error);
    const response = NextResponse.json({ error: 'Failed to update loyalty points' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

function getTierForPoints(points: number): string {
  if (points >= 1000) return 'platinum';
  if (points >= 500) return 'gold';
  if (points >= 250) return 'silver';
  return 'bronze';
}
