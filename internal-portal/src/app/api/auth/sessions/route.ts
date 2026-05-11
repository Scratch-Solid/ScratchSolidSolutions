export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logAuditEvent } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    
    // Mock session data for testing
    const sessions = [
      {
        id: 1,
        token: 'session-token-1',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        id: 2,
        token: 'session-token-2',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        ip_address: '192.168.1.2',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    ];

    return NextResponse.json({
      success: true,
      data: { sessions }
    });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    
    // Log session revocation
    await logAuditEvent(db, {
      action: 'session_revoked',
      resource: 'session',
      details: 'Session revoked by user',
      success: true
    });

    return NextResponse.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Session revoke error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke session' },
      { status: 500 }
    );
  }
}
