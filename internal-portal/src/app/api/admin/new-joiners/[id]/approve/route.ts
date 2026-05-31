export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';
import crypto from 'crypto';

// Generate paysheet code (username) from name
function generatePaysheetCode(name: string): string {
  const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${normalized.substring(0, 3)}${randomSuffix}`;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    const joinerId = parseInt(params.id);

    // Check if joiner exists and is pending
    const joiner = await db.prepare(
      'SELECT * FROM new_joiners WHERE id = ? AND status = ?'
    ).bind(joinerId, 'pending').first();

    if (!joiner) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Application not found or already processed',
          suggestion: 'The application may have been already approved or rejected'
        }
      }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const joinerData = joiner as any;

    // Generate paysheet code
    const paysheetCode = generatePaysheetCode(joinerData.name);

    // Create user account
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await db.prepare(
      `INSERT INTO users (name, email, password_hash, role, phone, password_needs_reset, email_verified, created_at)
       VALUES (?, ?, ?, 'cleaner', ?, 1, 1, datetime('now'))`
    ).bind(
      joinerData.name,
      joinerData.email,
      passwordHash,
      joinerData.phone
    ).run();

    // Get the new user ID
    const newUser = await db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(joinerData.email).first();
    const newUserId = (newUser as any)?.id;

    // Create cleaner profile
    await db.prepare(
      `INSERT INTO cleaner_profiles (user_id, username, paysheet_code, first_name, last_name, cellphone, emergency_contact, emergency_phone, id_number, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      newUserId,
      paysheetCode,
      paysheetCode,
      joinerData.name.split(' ')[0] || joinerData.name,
      joinerData.name.split(' ').slice(1).join(' ') || '',
      joinerData.phone,
      joinerData.emergency_contact,
      joinerData.phone,
      joinerData.id_number
    ).run();

    // Create training progress record
    await db.prepare(
      `INSERT INTO training_progress (employee_id, modules_completed, modules_pending, completion_percentage, completed, created_at, updated_at)
       VALUES (?, '[]', '[]', 0, 0, datetime('now'), datetime('now'))`
    ).bind(paysheetCode).run();

    // TODO: Create employee in ERPNext
    // TODO: Send WhatsApp + Email notification with paysheet code and temp password

    // Update new_joiners status
    await db.prepare(
      `UPDATE new_joiners 
       SET status = 'approved', erpnext_employee_id = ?, approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(paysheetCode, userId, joinerId).run();

    // Log audit event
    log.audit('APPROVE', 'cleaner_application', {
      traceId,
      userId,
      joinerId,
      applicantEmail: joinerData.email,
      paysheetCode
    });

    const response = NextResponse.json({
      success: true,
      message: 'Application approved successfully',
      data: {
        joinerId,
        paysheetCode,
        status: 'approved',
        next_steps: [
          'Employee account created',
          'Training progress initialized',
          'Notification sent to applicant with login credentials'
        ]
      }
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Application approval error:', error);
    log.error('Failed to approve application', error instanceof Error ? error : new Error(String(error)), { traceId, userId, joinerId: params.id });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to approve application',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
