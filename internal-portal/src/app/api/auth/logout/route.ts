import { NextRequest, NextResponse } from 'next/server';
import { getDb, deleteSession } from '@/lib/db';
import { withAuth, withSecurityHeaders, withTracing } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (token) {
    await deleteSession(db, token);
  }

  const response = NextResponse.json({ message: 'Logged out successfully' });
  return withSecurityHeaders(response, traceId);
}
