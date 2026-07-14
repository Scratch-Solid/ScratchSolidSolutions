export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withTracing, withSecurityHeaders } from '@/lib/middleware';
import { validatePasswordStrength, hashPassword } from '@/lib/auth';
import { log } from '@/lib/logger';
import crypto from 'crypto';
import { generateAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/session';

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

    const body = await request.json() as { paysheet_code?: string; password?: string };
    const { paysheet_code, password } = body;

    if (!paysheet_code || !password) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Paysheet code and password are required',
          suggestion: 'Please provide both your paysheet code and new password'
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password does not meet requirements',
          details: { errors: passwordValidation.errors }
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Look up cleaner by paysheet code
    const cleanerProfile = await db.prepare(
      'SELECT cp.user_id, cp.paysheet_code, u.name, u.email, u.role FROM cleaner_profiles cp JOIN users u ON cp.user_id = u.id WHERE cp.paysheet_code = ?'
    ).bind(paysheet_code).first();

    if (!cleanerProfile) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Invalid paysheet code',
          suggestion: 'Please check your paysheet code and try again'
        }
      }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const cleaner = cleanerProfile as any;

    // Hash the new password
    const passwordHash = await hashPassword(password);

    // Update user with new password
    try {
      await db.prepare(
        'UPDATE users SET password_hash = ?, password_needs_reset = 0, updated_at = datetime("now") WHERE id = ?'
      ).bind(passwordHash, cleaner.user_id).run();
    } catch {
      await db.prepare(
        'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(passwordHash, cleaner.user_id).run();
    }

    const onboardingRecord = await db.prepare(
      `SELECT background_check_consent, contract_signed, completed
       FROM training_progress
       WHERE employee_id = ?`
    ).bind(cleaner.paysheet_code).first() as {
      background_check_consent?: number | null;
      contract_signed?: number | null;
      completed?: number | null;
    } | null;

    let redirectTo: '/cleaner-pre-dashboard' | '/cleaner-dashboard' = '/cleaner-pre-dashboard';
    let onboardingState = 'training_record_missing';

    if (onboardingRecord) {
      if (onboardingRecord.background_check_consent !== 1) {
        onboardingState = 'consent_pending';
      } else if (onboardingRecord.contract_signed !== 1) {
        onboardingState = 'contract_pending';
      } else if (onboardingRecord.completed !== 1) {
        onboardingState = 'training_pending';
      } else {
        onboardingState = 'active';
        redirectTo = '/cleaner-dashboard';
      }
    }

    // Log login activity
    await db.prepare(
      `INSERT INTO login_activity (user_id, stage, timestamp, success, ip_address, user_agent)
       VALUES (?, ?, datetime('now'), 1, ?, ?)`
    ).bind(
      cleaner.user_id,
      redirectTo === '/cleaner-dashboard' ? 'cleaner_dashboard' : 'pre_dashboard',
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent')?.slice(0, 200) || 'unknown'
    ).run();

    // Generate JWT token
    const token = await generateAccessToken(cleaner.user_id, cleaner.email, cleaner.role);
    const refreshToken = await generateRefreshToken(cleaner.user_id, crypto.randomUUID());

    // Log audit event
    log.audit('PASSWORD_SETUP', 'cleaner', {
      traceId,
      userId: cleaner.user_id,
      paysheetCode: paysheet_code
    });

    const response = NextResponse.json({
      success: true,
      token,
      redirect_to: redirectTo,
      message: 'Password set successfully',
      onboarding: {
        onboarding_state: onboardingState,
        redirect_to: redirectTo,
        can_transition_to_cleaner_dashboard: redirectTo === '/cleaner-dashboard'
      },
      data: {
        token,
        user: {
          id: cleaner.user_id,
          name: cleaner.name,
          email: cleaner.email,
          role: cleaner.role,
          paysheet_code: cleaner.paysheet_code
        },
        redirect_to: redirectTo
      }
    });
    setAuthCookies(response, token, refreshToken);
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Password setup error:', error);
    log.error('Password setup failed', error instanceof Error ? error : new Error(String(error)), { traceId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to set password: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
