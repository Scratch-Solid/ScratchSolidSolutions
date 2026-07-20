export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/session';

// Migrated off cleaner_profiles (2026-07-20 consolidation, see
// migrations/067_consolidate_cleaner_profiles_into_staff.sql). The old
// `OR cp.username = ?` clause is gone - cleaner_profiles.username was
// always set to the same value as paysheet_code, so staff.paysheet_code
// alone covers both. `username` is still returned in the result shape for
// existing callers, aliased from paysheet_code.
async function findCleanerForLogin(db: D1Database, paysheetCode: string) {
  const queries = [
    'SELECT s.user_id, s.paysheet_code, s.paysheet_code as username, u.name, u.email, u.role, u.password_needs_reset, u.password_hash FROM staff s JOIN users u ON s.user_id = u.id WHERE s.paysheet_code = ?',
    'SELECT s.user_id, s.paysheet_code, s.paysheet_code as username, u.name, u.email, u.role, 0 as password_needs_reset, u.password_hash FROM staff s JOIN users u ON s.user_id = u.id WHERE s.paysheet_code = ?',
  ];

  for (const sql of queries) {
    try {
      const cleaner = await db.prepare(sql).bind(paysheetCode).first();
      if (cleaner) {
        return cleaner;
      }
    } catch {
    }
  }

  return null;
}

async function getCleanerOnboardingStatus(db: D1Database, userId: number) {
  const cleanerRecord = await db.prepare(
    `SELECT
      s.paysheet_code,
      tp.background_check_consent,
      tp.contract_signed,
      tp.completed,
      tp.completion_percentage
    FROM staff s
    LEFT JOIN training_progress tp ON s.paysheet_code = tp.employee_id
    WHERE s.user_id = ?`
  ).bind(userId).first();

  if (!cleanerRecord) {
    return {
      onboarding_state: 'profile_missing',
      redirect_to: '/cleaner-pre-dashboard',
      next_step: 'contact_support',
      can_transition_to_cleaner_dashboard: false,
    };
  }

  const cleaner = cleanerRecord as {
    background_check_consent?: number | null;
    contract_signed?: number | null;
    completed?: number | null;
    completion_percentage?: number | null;
  };

  if (
    cleaner.background_check_consent == null &&
    cleaner.contract_signed == null &&
    cleaner.completed == null &&
    cleaner.completion_percentage == null
  ) {
    return {
      onboarding_state: 'training_record_missing',
      redirect_to: '/cleaner-pre-dashboard',
      next_step: 'contact_support',
      can_transition_to_cleaner_dashboard: false,
    };
  }

  if (cleaner.background_check_consent !== 1) {
    return {
      onboarding_state: 'consent_pending',
      redirect_to: '/cleaner-pre-dashboard',
      next_step: 'background_check_consent',
      can_transition_to_cleaner_dashboard: false,
    };
  }

  if (cleaner.contract_signed !== 1) {
    return {
      onboarding_state: 'contract_pending',
      redirect_to: '/cleaner-pre-dashboard',
      next_step: 'contract_sign',
      can_transition_to_cleaner_dashboard: false,
    };
  }

  if (cleaner.completed !== 1) {
    return {
      onboarding_state: 'training_pending',
      redirect_to: '/cleaner-pre-dashboard',
      next_step: 'training',
      can_transition_to_cleaner_dashboard: false,
    };
  }

  return {
    onboarding_state: 'active',
    redirect_to: '/cleaner-dashboard',
    next_step: 'complete',
    can_transition_to_cleaner_dashboard: true,
  };
}

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
    const cleanerProfile = await findCleanerForLogin(db, paysheet_code);

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

    if (!password) {
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
    }

    let passwordHash = cleaner.password_hash as string;
    if (Array.isArray(cleaner.password_hash)) {
      passwordHash = String.fromCharCode(...cleaner.password_hash);
    } else if (typeof cleaner.password_hash === 'object' && cleaner.password_hash !== null) {
      passwordHash = JSON.stringify(cleaner.password_hash);
    }

    let isValidPassword = await bcrypt.compare(password, passwordHash);
    if (!isValidPassword) {
      const normalizedPassword = password.replace(/\D/g, '');
      if (normalizedPassword && normalizedPassword !== password) {
        isValidPassword = await bcrypt.compare(normalizedPassword, passwordHash);
      }
    }

    if (!isValidPassword) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials',
          suggestion: 'Please check your paysheet code and password and try again'
        }
      }, { status: 401 });
      return withSecurityHeaders(response, traceId);
    }

    const onboardingStatus = await getCleanerOnboardingStatus(db, Number(cleaner.user_id));
    const accessToken = await generateAccessToken(Number(cleaner.user_id), String(cleaner.email), String(cleaner.role || 'cleaner'));
    const refreshToken = await generateRefreshToken(Number(cleaner.user_id), crypto.randomUUID());

    try {
      await db.prepare(
        `INSERT INTO login_activity (user_id, stage, timestamp, success, ip_address, user_agent)
         VALUES (?, ?, datetime('now'), 1, ?, ?)`
      ).bind(
        cleaner.user_id,
        onboardingStatus.redirect_to === '/cleaner-dashboard' ? 'cleaner_dashboard' : 'pre_dashboard',
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent')?.slice(0, 200) || 'unknown'
      ).run();
    } catch {
    }

    const response = NextResponse.json({
      success: true,
      token: accessToken,
      role: cleaner.role || 'cleaner',
      redirect_to: onboardingStatus.redirect_to,
      onboarding: onboardingStatus,
      user: {
        id: cleaner.user_id,
        name: cleaner.name,
        email: cleaner.email,
        paysheet_code: cleaner.paysheet_code,
        username: cleaner.username
      }
    });
    setAuthCookies(response, accessToken, refreshToken);
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Cleaner login error:', error);
    log.error('Cleaner login failed', error instanceof Error ? error : new Error(String(error)), { traceId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
