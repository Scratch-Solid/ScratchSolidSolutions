import { NextRequest, NextResponse } from 'next/server';
import { adminProxyObserver } from '@/lib/security/popia-compliance';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, targetUserId, sessionId } = body;
    const userId = (request as any).user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (action === 'start') {
      if (!targetUserId) {
        return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
      }

      const newSessionId = await adminProxyObserver.startSession(
        db,
        userId,
        targetUserId,
        ipAddress,
        userAgent
      );

      return NextResponse.json({ sessionId: newSessionId, message: 'Session started' });
    }

    if (action === 'end') {
      if (!sessionId) {
        return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
      }

      await adminProxyObserver.endSession(db, sessionId);

      return NextResponse.json({ message: 'Session ended' });
    }

    if (action === 'view') {
      if (!sessionId) {
        return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
      }

      const session = adminProxyObserver.getSession(sessionId);
      if (!session || !adminProxyObserver.isSessionValid(sessionId)) {
        return NextResponse.json({ error: 'Invalid or expired session' }, { status: 404 });
      }

      return NextResponse.json({
        sessionId,
        targetUserId: session.targetUserId,
        startedAt: session.startedAt,
        isValid: true
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Proxy observer error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
