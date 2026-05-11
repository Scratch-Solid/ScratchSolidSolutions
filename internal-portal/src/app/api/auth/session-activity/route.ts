export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/better-auth';
import { getSessionActivity, detectSuspiciousActivity } from '@/lib/session-activity-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const userId = session.user.id;

    const activities = await getSessionActivity(userId, limit);
    const isSuspicious = await detectSuspiciousActivity(userId);

    return NextResponse.json({
      activities,
      isSuspicious,
      user: session.user
    });
  } catch (error) {
    console.error('Failed to get session activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
