export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, verifyEmailToken } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/auth?error=missing_token', request.url));
  }

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  const verified = await verifyEmailToken(db, token);

  if (!verified) {
    return NextResponse.redirect(new URL('/auth?error=invalid_or_expired_token', request.url));
  }

  return NextResponse.redirect(new URL('/auth?verified=1', request.url));
}
