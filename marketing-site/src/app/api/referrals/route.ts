import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const userId = (user as any).id;

    // Generate unique referral code
    const referralCode = generateReferralCode(userId);

    // Check if user already has a referral code
    const existing = await db.prepare('SELECT id FROM referrals WHERE referrer_id = ?').bind(userId).first();

    if (existing) {
      const response = NextResponse.json({ error: 'Referral code already exists' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Create referral
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await db.prepare(
      `INSERT INTO referrals (referrer_id, referral_code, status, reward_points, created_at, expires_at)
       VALUES (?, ?, 'pending', 100, datetime('now'), ?)`
    ).bind(userId, referralCode, expiresAt.toISOString()).run();

    logger.info(`Referral code generated for user ${userId}: ${referralCode}`);

    const response = NextResponse.json({ referral_code: referralCode, reward_points: 100, expires_at: expiresAt.toISOString() }, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error generating referral code', error as Error);
    const response = NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const userId = (user as any).id;

    // Get user's referrals
    const referrals = await db.prepare(
      `SELECT r.*, u.first_name, u.last_name 
       FROM referrals r
       LEFT JOIN users u ON r.referred_user_id = u.id
       WHERE r.referrer_id = ?
       ORDER BY r.created_at DESC`
    ).bind(userId).all();

    // Get user's referral code
    const referral = await db.prepare(
      'SELECT referral_code, reward_points, status FROM referrals WHERE referrer_id = ?'
    ).bind(userId).first();

    const response = NextResponse.json({
      referral_code: referral?.referral_code || null,
      reward_points: referral?.reward_points || 100,
      referrals: referrals.results || []
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching referrals', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

function generateReferralCode(userId: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
