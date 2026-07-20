/**
 * ScratchSolid Error Message Library
 * World-class, actionable error messages for clients, cleaners, and staff.
 * Every error includes: a user-friendly message, a technical code, and next steps.
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ErrorAudience = 'client' | 'cleaner' | 'staff' | 'system';

export interface ScratchSolidError {
  code: string;
  severity: ErrorSeverity;
  audience: ErrorAudience;
  /** Human-friendly message shown to the user */
  userMessage: string;
  /** Technical detail for logs / staff dashboards */
  technicalDetail: string;
  /** What the user should do next */
  nextSteps: string;
  /** HTTP status code, if applicable */
  httpStatus?: number;
  /** Whether the error is retryable */
  retryable: boolean;
  /** Suggested retry delay in seconds */
  retryAfterSeconds?: number;
  /** Link to help documentation */
  helpLink?: string;
}

// ═══════════════════════════════════════════════════════════════════
// AUTH ERRORS
// ═══════════════════════════════════════════════════════════════════

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: (audience: ErrorAudience = 'client'): ScratchSolidError => ({
    code: 'AUTH_001',
    severity: 'warning',
    audience,
    userMessage:
      audience === 'staff'
        ? 'Invalid username or password. Please check your credentials and try again.'
        : 'The email or password you entered is incorrect. Please try again.',
    technicalDetail: 'Authentication failed: bcrypt compare returned false or user not found.',
    nextSteps: 'If you forgot your password, use the "Forgot Password" link. For persistent issues, contact support.',
    httpStatus: 401,
    retryable: true,
    retryAfterSeconds: 2,
  }),

  SESSION_EXPIRED: (audience: ErrorAudience = 'client'): ScratchSolidError => ({
    code: 'AUTH_002',
    severity: 'info',
    audience,
    userMessage:
      'Your session has expired for security reasons. Please sign in again.',
    technicalDetail: 'JWT validation failed: token expired or signature invalid.',
    nextSteps: 'Sign in again with your credentials. Your data is safe.',
    httpStatus: 401,
    retryable: true,
  }),

  ACCOUNT_LOCKED: (audience: ErrorAudience = 'client', lockoutMinutes?: number): ScratchSolidError => ({
    code: 'AUTH_003',
    severity: 'error',
    audience,
    userMessage:
      audience === 'staff'
        ? `Too many failed login attempts. Your account is temporarily locked for ${lockoutMinutes || 15} minutes.`
        : 'For your security, your account is temporarily locked due to multiple failed login attempts.',
    technicalDetail: `Account lockout triggered after 5 failed attempts. Lockout duration: ${lockoutMinutes || 15} minutes.`,
    nextSteps: `Wait ${lockoutMinutes || 15} minutes, then try again. If you need immediate access, contact an administrator.`,
    httpStatus: 403,
    retryable: true,
    retryAfterSeconds: (lockoutMinutes || 15) * 60,
  }),

  INSUFFICIENT_PERMISSIONS: (audience: ErrorAudience = 'staff', resource?: string): ScratchSolidError => ({
    code: 'AUTH_004',
    severity: 'warning',
    audience,
    userMessage: `You do not have permission to access this ${resource || 'resource'}.`,
    technicalDetail: `RBAC check failed: user role does not have permission for ${resource || 'resource'}.`,
    nextSteps: 'Contact your supervisor or system administrator if you believe this is an error.',
    httpStatus: 403,
    retryable: false,
  }),

  CSRF_INVALID: (): ScratchSolidError => ({
    code: 'AUTH_005',
    severity: 'warning',
    audience: 'system',
    userMessage: 'Your request could not be processed securely. Please refresh the page and try again.',
    technicalDetail: 'CSRF token validation failed: missing, expired, or mismatched token.',
    nextSteps: 'Refresh the page to generate a new security token, then retry your action.',
    httpStatus: 403,
    retryable: true,
  }),
};

// ═══════════════════════════════════════════════════════════════════
// BOOKING / JOB ERRORS
// ═══════════════════════════════════════════════════════════════════

export const BOOKING_ERRORS = {
  NOT_FOUND: (id: string, audience: ErrorAudience = 'staff'): ScratchSolidError => ({
    code: 'BKNG_001',
    severity: 'warning',
    audience,
    userMessage:
      audience === 'client'
        ? 'We could not find your booking. Please check your confirmation email or contact support.'
        : `Booking or job ${id} not found.`,
    technicalDetail: `Job lookup failed: no record in jobs table for id=${id}.`,
    nextSteps:
      audience === 'client'
        ? 'Contact support at support@scratchsolidsolutions.org with your booking reference.'
        : 'Verify the ID and check if the record was deleted or migrated.',
    httpStatus: 404,
    retryable: false,
  }),

  TIME_SLOT_UNAVAILABLE: (date: string, time?: string): ScratchSolidError => ({
    code: 'BKNG_002',
    severity: 'info',
    audience: 'client',
    userMessage: `The selected time slot on ${date}${time ? ` at ${time}` : ''} is no longer available.`,
    technicalDetail: 'Booking conflict detected: overlapping booking_assignment exists for the requested time slot.',
    nextSteps: 'Please select a different date or time. Our popular slots fill up quickly — book in advance!',
    httpStatus: 409,
    retryable: true,
  }),

  ALREADY_ASSIGNED: (jobId: string): ScratchSolidError => ({
    code: 'BKNG_003',
    severity: 'warning',
    audience: 'staff',
    userMessage: `Job ${jobId} is already assigned to a cleaner team.`,
    technicalDetail: `Assignment rejected: job.status !== 'scheduled' or supervisor_id already set.`,
    nextSteps: 'To reassign, first unassign the current team via the admin panel.',
    httpStatus: 409,
    retryable: false,
  }),

  DUPLICATE_BOOKING: (calcomUid: string): ScratchSolidError => ({
    code: 'BKNG_004',
    severity: 'info',
    audience: 'system',
    userMessage: 'This booking has already been processed.',
    technicalDetail: `Duplicate Cal.com UID detected: ${calcomUid}. Job already exists in jobs table.`,
    nextSteps: 'No action needed. The booking was previously ingested successfully.',
    httpStatus: 409,
    retryable: false,
  }),
};

// ═══════════════════════════════════════════════════════════════════
// PAYMENT / INVOICE ERRORS
// ═══════════════════════════════════════════════════════════════════

export const PAYMENT_ERRORS = {
  INVOICE_CREATION_FAILED: (jobId: string, zohoError?: string): ScratchSolidError => ({
    code: 'PAY_001',
    severity: 'error',
    audience: 'staff',
    userMessage: `Failed to create invoice for job ${jobId}.`,
    technicalDetail: `Zoho invoice creation failed for job ${jobId}. Zoho error: ${zohoError || 'unknown'}.`,
    nextSteps: 'Check Zoho Books API status, verify customer details, and retry via the admin panel.',
    httpStatus: 502,
    retryable: true,
    retryAfterSeconds: 60,
  }),

  PAYMENT_VERIFICATION_FAILED: (invoiceId: string): ScratchSolidError => ({
    code: 'PAY_002',
    severity: 'warning',
    audience: 'staff',
    userMessage: `Payment for invoice ${invoiceId} could not be verified.`,
    technicalDetail: `Zoho POP verification failed: no matching payment found for invoice ${invoiceId}.`,
    nextSteps: 'Request the client send a clear screenshot of their payment confirmation, then verify manually.',
    httpStatus: 400,
    retryable: true,
  }),

  PRICING_NOT_FOUND: (serviceType: string): ScratchSolidError => ({
    code: 'PAY_003',
    severity: 'error',
    audience: 'staff',
    userMessage: `Pricing configuration missing for service type "${serviceType}".`,
    technicalDetail: `No active pricing_config row found for service_type=${serviceType}.`,
    nextSteps: 'Add pricing for this service type in the admin pricing matrix before accepting bookings.',
    httpStatus: 400,
    retryable: false,
  }),
};

// ═══════════════════════════════════════════════════════════════════
// CLEANER / WORKFORCE ERRORS
// ═══════════════════════════════════════════════════════════════════

export const WORKFORCE_ERRORS = {
  CLEANER_NOT_FOUND: (id: string): ScratchSolidError => ({
    code: 'WRK_001',
    severity: 'warning',
    audience: 'staff',
    userMessage: `Cleaner ${id} not found or inactive.`,
    technicalDetail: `Cleaner lookup failed: no active staff record for id=${id}.`,
    nextSteps: 'Verify the cleaner ID and check if the profile was deactivated.',
    httpStatus: 404,
    retryable: false,
  }),

  ERPNEXT_SHIFT_FAILED: (jobId: string, reason?: string): ScratchSolidError => ({
    code: 'WRK_002',
    severity: 'error',
    audience: 'staff',
    userMessage: `Failed to create ERPNext shift for job ${jobId}.`,
    technicalDetail: `ERPNext shift creation failed: ${reason || 'unknown error'}.`,
    nextSteps: 'Check ERPNext connectivity and employee records, then retry from the supervisor dashboard.',
    httpStatus: 502,
    retryable: true,
    retryAfterSeconds: 120,
  }),

  TRAINING_INCOMPLETE: (moduleId: number): ScratchSolidError => ({
    code: 'WRK_003',
    severity: 'info',
    audience: 'cleaner',
    userMessage: `You must complete training module ${moduleId} before proceeding.`,
    technicalDetail: `Training gate blocked: employee_training_progress.current_module_id < ${moduleId}.`,
    nextSteps: 'Complete your assigned training modules in the Training section of your dashboard.',
    httpStatus: 403,
    retryable: false,
  }),
};

// ═══════════════════════════════════════════════════════════════════
// WHATSAPP / NOTIFICATION ERRORS
// ═══════════════════════════════════════════════════════════════════

export const NOTIFICATION_ERRORS = {
  WHATSAPP_SEND_FAILED: (phone: string, fallbackSent: boolean): ScratchSolidError => ({
    code: 'NTF_001',
    severity: fallbackSent ? 'warning' : 'error',
    audience: 'system',
    userMessage: fallbackSent
      ? 'WhatsApp delivery failed; fallback email sent successfully.'
      : 'Message could not be delivered via WhatsApp or email.',
    technicalDetail: `Meta Cloud API message send failed for ${phone}. Fallback email: ${fallbackSent}.`,
    nextSteps: fallbackSent
      ? 'No action needed — recipient notified via email. Verify their WhatsApp number is correct.'
      : 'Verify phone number and email address. Check Meta Cloud API credentials and Resend API status.',
    httpStatus: fallbackSent ? 200 : 502,
    retryable: !fallbackSent,
    retryAfterSeconds: 300,
  }),

  CONVERSATION_WINDOW_CLOSED: (phone: string): ScratchSolidError => ({
    code: 'NTF_002',
    severity: 'info',
    audience: 'system',
    userMessage: 'WhatsApp conversation window is closed; notification sent via email fallback.',
    technicalDetail: `24h conversation window expired for ${phone}. Per the free-tier strategy, we never send paid template messages. Routed via Resend email fallback instead.`,
    nextSteps: 'No action needed. Recipient notified via email. Verify their email address is correct for future notifications.',
    httpStatus: 200,
    retryable: false,
  }),
};

// ═══════════════════════════════════════════════════════════════════
// SYSTEM / INFRASTRUCTURE ERRORS
// ═══════════════════════════════════════════════════════════════════

export const SYSTEM_ERRORS = {
  DATABASE_UNAVAILABLE: (): ScratchSolidError => ({
    code: 'SYS_001',
    severity: 'critical',
    audience: 'system',
    userMessage: 'We are experiencing a temporary service issue. Please try again in a few moments.',
    technicalDetail: 'D1 database connection failed or returned null.',
    nextSteps: 'This is automatically retried. If it persists, check Cloudflare D1 status and wrangler bindings.',
    httpStatus: 503,
    retryable: true,
    retryAfterSeconds: 5,
  }),

  RATE_LIMITED: (retryAfter: number): ScratchSolidError => ({
    code: 'SYS_002',
    severity: 'warning',
    audience: 'client',
    userMessage: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
    technicalDetail: `Rate limit exceeded: ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW}ms window.`,
    nextSteps: 'Slow down your requests. If you are a staff member, batch operations where possible.',
    httpStatus: 429,
    retryable: true,
    retryAfterSeconds: retryAfter,
  }),

  UNEXPECTED_ERROR: (traceId: string): ScratchSolidError => ({
    code: 'SYS_999',
    severity: 'critical',
    audience: 'system',
    userMessage: 'Something went wrong on our end. We have logged the issue and are looking into it.',
    technicalDetail: `Uncaught exception. Trace ID: ${traceId}.`,
    nextSteps: `Quote trace ID ${traceId} when contacting support. Our team is notified automatically.`,
    httpStatus: 500,
    retryable: true,
    retryAfterSeconds: 10,
  }),
};

// ═══════════════════════════════════════════════════════════════════
// EXPORT HELPERS
// ═══════════════════════════════════════════════════════════════════

import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW } from '../middleware';

/** Format an error into a standardized JSON response */
export function formatErrorResponse(error: ScratchSolidError): {
  success: false;
  error: {
    code: string;
    message: string;
    next_steps: string;
    trace_id?: string;
    retryable: boolean;
    retry_after_seconds?: number;
  };
} {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.userMessage,
      next_steps: error.nextSteps,
      retryable: error.retryable,
      retry_after_seconds: error.retryAfterSeconds,
    },
  };
}

/** Log an error with full technical context */
export function logError(
  error: ScratchSolidError,
  context: Record<string, unknown> = {},
  consoleLogger: typeof console.error = console.error
): void {
  consoleLogger(
    JSON.stringify({
      level: error.severity,
      code: error.code,
      audience: error.audience,
      message: error.technicalDetail,
      http_status: error.httpStatus,
      ...context,
    })
  );
}

/** Build a NextResponse from a ScratchSolidError */
export function errorToResponse(error: ScratchSolidError, traceId?: string) {
  const body = formatErrorResponse(error);
  if (traceId) {
    body.error.trace_id = traceId;
  }
  return new Response(JSON.stringify(body), {
    status: error.httpStatus || 500,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': error.retryAfterSeconds?.toString() || '10',
    },
  });
}
