export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getSessionActivity, detectSuspiciousActivity } from '@/lib/session-activity-logger';
import { withAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    const authResult = await withAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    
    const { user } = authResult;
    // @ts-ignore - Handle flexible user type from middleware
    const userId = user?.userId || user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const activities = await getSessionActivity(userId, limit);
    const isSuspicious = await detectSuspiciousActivity(userId);

    return NextResponse.json({
      activities,
      isSuspicious,
      user
    });
  } catch (error) {
    console.error('Failed to get session activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
