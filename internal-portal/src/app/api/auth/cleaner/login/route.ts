export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);

  try {
    const db = await getDb();
    if (!db) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database unavailable',
          suggestion: 'Please try again later'
        }
      }, { status: 503 });
      return withSecurityHeaders(response, traceId);
    }

    const body = await request.json() as { paysheet_code?: string };
    const { paysheet_code } = body;

    if (!paysheet_code) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Paysheet code is required',
          suggestion: 'Please provide your paysheet code'
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Look up cleaner by paysheet code
    const cleanerProfile = await db.prepare(
      'SELECT cp.user_id, cp.paysheet_code, u.name, u.email, u.password_needs_reset, u.password_hash FROM cleaner_profiles cp JOIN users u ON cp.user_id = u.id WHERE cp.paysheet_code = ?'
    ).bind(paysheet_code).first();

    if (!cleanerProfile) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Invalid paysheet code',
          suggestion: 'Please check your paysheet code and try again, or contact support'
        }
      }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const cleaner = cleanerProfile as any;

    // Check if user needs to set password (first-time login)
    const needsPasswordSetup = cleaner.password_needs_reset === 1 || !cleaner.password_hash;

    if (needsPasswordSetup) {
      const response = NextResponse.json({
        success: true,
        requires_password_setup: true,
        user: {
          name: cleaner.name,
          email: cleaner.email,
          paysheet_code: cleaner.paysheet_code
        },
        next_step: 'Please set up your password to continue'
      });
      return withSecurityHeaders(response, traceId);
    }

    // User has password, return that they need to provide it
    const response = NextResponse.json({
      success: true,
      requires_password: true,
      user: {
        name: cleaner.name,
        email: cleaner.email,
        paysheet_code: cleaner.paysheet_code
      }
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Cleaner login error:', error);
    log.error('Cleaner login failed', error instanceof Error ? error : new Error(String(error)), { traceId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Login failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
