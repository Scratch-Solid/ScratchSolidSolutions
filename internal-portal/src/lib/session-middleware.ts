import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/better-auth';
import { getDb, logAuditEvent } from '@/lib/db';
import { getClientIP } from '@/lib/middleware';

const MAX_CONCURRENT_SESSIONS = 3;

export async function enforceSessionLimits(request: NextRequest, userId: number) {
  const db = await getDb();
  
  try {
    // Count active sessions for the user
    const existingSessions = await db.prepare(
      'SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND expires_at > datetime("now")'
    ).bind(userId).first();
    
    const sessionCount = (existingSessions as any)?.count || 0;
    let sessionsToRevoke: any = null;
    
    // If at limit, revoke oldest sessions
    if (sessionCount >= MAX_CONCURRENT_SESSIONS) {
      sessionsToRevoke = await db.prepare(
        'SELECT id, token, created_at FROM sessions WHERE user_id = ? AND expires_at > datetime("now") ORDER BY created_at ASC LIMIT ?'
      ).bind(userId, sessionCount - MAX_CONCURRENT_SESSIONS + 1).all();
      
      for (const session of sessionsToRevoke.results || []) {
        await db.prepare('DELETE FROM sessions WHERE id = ?').bind(session.id).run();
        
        // Log session revocation
        await logAuditEvent(db, {
          user_id: userId,
          action: 'SESSION_REVOKED_LIMIT',
          resource: 'session',
          resource_id: session.id.toString(),
          ip_address: getClientIP(request),
          user_agent: request.headers.get('user-agent') || '',
          details: JSON.stringify({ 
            reason: 'concurrent_limit_exceeded',
            sessionAge: session.created_at 
          }),
          success: true
        });
      }
    }
    
    return { success: true, revokedCount: (sessionsToRevoke?.results?.length) || 0 };
    
  } catch (error) {
    console.error('Session limit enforcement error:', error);
    return { success: false, error: 'Failed to enforce session limits' };
  }
}

export async function validateSession(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session || !session.user) {
      return { valid: false, error: 'No valid session found' };
    }

    // Check if session exists in database and is not expired
    const db = await getDb();
    const dbSession = await db.prepare(
      'SELECT * FROM sessions WHERE user_id = ? AND expires_at > datetime("now") ORDER BY created_at DESC LIMIT 1'
    ).bind(Number(session.user.id)).first();

    if (!dbSession) {
      return { valid: false, error: 'Session not found in database' };
    }

    return { 
      valid: true, 
      session: {
        ...session,
        dbSession
      }
    };
    
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, error: 'Session validation failed' };
  }
}

export async function createSessionWithLimit(
  request: NextRequest, 
  userId: number, 
  sessionToken: string, 
  refreshToken?: string
) {
  const db = await getDb();
  
  try {
    // First enforce session limits
    const limitResult = await enforceSessionLimits(request, userId);
    
    if (!limitResult.success) {
      return { success: false, error: limitResult.error };
    }

    // Create new session
    await db.prepare(
      `INSERT INTO sessions (user_id, token, refresh_token, expires_at) 
       VALUES (?, ?, ?, datetime('now', '+7 days'))`
    ).bind(userId, sessionToken, refreshToken || null).run();

    // Log session creation
    await logAuditEvent(db, {
      user_id: userId,
      action: 'SESSION_CREATED',
      resource: 'session',
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      details: JSON.stringify({ 
        revokedOldSessions: limitResult.revokedCount 
      }),
      success: true
    });

    return { 
      success: true, 
      revokedCount: limitResult.revokedCount 
    };
    
  } catch (error) {
    console.error('Session creation error:', error);
    return { success: false, error: 'Failed to create session' };
  }
}
