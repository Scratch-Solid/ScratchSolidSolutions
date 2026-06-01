export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/session';

async function findCleanerForLogin(db: D1Database, paysheetCode: string) {
  const queries = [
    'SELECT cp.user_id, cp.paysheet_code, cp.username, u.name, u.email, u.role, u.password_needs_reset, u.password_hash FROM cleaner_profiles cp JOIN users u ON cp.user_id = u.id WHERE cp.paysheet_code = ? OR cp.username = ?',
    'SELECT cp.user_id, cp.paysheet_code, cp.username, u.name, u.email, u.role, 0 as password_needs_reset, u.password_hash FROM cleaner_profiles cp JOIN users u ON cp.user_id = u.id WHERE cp.paysheet_code = ? OR cp.username = ?',
  ];

  for (const sql of queries) {
    try {
      const cleaner = await db.prepare(sql).bind(paysheetCode, paysheetCode).first();
      if (cleaner) {
        return cleaner;
      }
    } catch {
    }
  }

  return null;
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

    const accessToken = generateAccessToken(Number(cleaner.user_id), String(cleaner.email), String(cleaner.role || 'cleaner'));
    const refreshToken = generateRefreshToken(Number(cleaner.user_id), crypto.randomUUID());

    const response = NextResponse.json({
      success: true,
      token: accessToken,
      role: cleaner.role || 'cleaner',
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
