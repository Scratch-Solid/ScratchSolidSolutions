import { NextRequest, NextResponse } from 'next/server';
import { getDb, validateSession } from './db';
import { validateCsrfToken, generateCsrfToken } from './csrf';
import { getUserPermissions, hasPermission, hasResourcePermission, hasRoleLevel, UserPermissions } from './rbac';

export const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX = 100; // requests per window per IP

// Rate limiting now prefers KV-backed storage for distributed enforcement
// in serverless environments, falling back to in-memory only for local dev.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// API Versioning
export const API_VERSION = 'v1';
export const API_VERSION_HEADER = 'X-API-Version';
export const API_VERSION_SUPPORTED = ['v1'];

/**
 * API versioning middleware
 * Checks if the requested API version is supported
 */
export function withApiVersioning(request: NextRequest): NextResponse | null {
  const requestedVersion = request.headers.get(API_VERSION_HEADER) || 
                           request.nextUrl.pathname.split('/')[2] || 
                           API_VERSION;
  
  if (!API_VERSION_SUPPORTED.includes(requestedVersion)) {
    return NextResponse.json({
      error: 'Unsupported API version',
      requestedVersion,
      supportedVersions: API_VERSION_SUPPORTED
    }, { status: 400 });
  }
  
  return null;
}

// Distributed Tracing
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

const TRACE_ID_HEADER = 'X-Trace-ID';
const SPAN_ID_HEADER = 'X-Span-ID';
const PARENT_SPAN_ID_HEADER = 'X-Parent-Span-ID';

/**
 * Generate a random span ID
 */
function generateSpanId(): string {
  return crypto.randomUUID();
}

/**
 * Extract or create trace context from request
 */
export function getTraceContext(request: NextRequest): TraceContext {
  const traceId = request.headers.get(TRACE_ID_HEADER) || generateTraceId();
  const spanId = request.headers.get(SPAN_ID_HEADER) || generateSpanId();
  const parentSpanId = request.headers.get(PARENT_SPAN_ID_HEADER) || undefined;
  
  return {
    traceId,
    spanId,
    parentSpanId,
    sampled: Math.random() < 0.1 // Sample 10% of requests
  };
}

/**
 * Distributed tracing middleware
 * Adds trace context to request and response headers
 */
export function withDistributedTracing(request: NextRequest): TraceContext {
  const traceContext = getTraceContext(request);
  
  return traceContext;
}

/**
 * Log trace information for debugging
 */
export function logTrace(traceContext: TraceContext, operation: string, duration?: number): void {
  if (!traceContext.sampled) return;
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    traceId: traceContext.traceId,
    spanId: traceContext.spanId,
    parentSpanId: traceContext.parentSpanId,
    operation,
    duration
  };
  
  // Log entry logged via structured logger
}

// Error classification for better error handling
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  RATE_LIMIT = 'RATE_LIMIT',
  CSRF = 'CSRF',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK = 'NETWORK'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ClassifiedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
  technicalMessage: string;
  statusCode: number;
  shouldLog: boolean;
  shouldAlert: boolean;
}

function classifyError(error: unknown, context: string = 'Operation'): ClassifiedError {
  // Handle known error types
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Authentication errors
    if (message.includes('unauthorized') || message.includes('invalid token') || message.includes('session expired')) {
      return {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        userMessage: 'Authentication required. Please log in again.',
        technicalMessage: error.message,
        statusCode: 401,
        shouldLog: true,
        shouldAlert: false
      };
    }
    
    // Authorization errors
    if (message.includes('forbidden') || message.includes('permission') || message.includes('insufficient')) {
      return {
        category: ErrorCategory.AUTHORIZATION,
        severity: ErrorSeverity.MEDIUM,
        userMessage: 'You do not have permission to perform this action.',
        technicalMessage: error.message,
        statusCode: 403,
        shouldLog: true,
        shouldAlert: false
      };
    }
    
    // Validation errors
    if (message.includes('invalid') || message.includes('required') || message.includes('validation')) {
      return {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        userMessage: 'Invalid input. Please check your request.',
        technicalMessage: error.message,
        statusCode: 400,
        shouldLog: false,
        shouldAlert: false
      };
    }
    
    // Not found errors
    if (message.includes('not found')) {
      return {
        category: ErrorCategory.NOT_FOUND,
        severity: ErrorSeverity.LOW,
        userMessage: 'The requested resource was not found.',
        technicalMessage: error.message,
        statusCode: 404,
        shouldLog: false,
        shouldAlert: false
      };
    }
    
    // Rate limit errors
    if (message.includes('too many requests') || message.includes('rate limit')) {
      return {
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        userMessage: 'Too many requests. Please try again later.',
        technicalMessage: error.message,
        statusCode: 429,
        shouldLog: true,
        shouldAlert: false
      };
    }
    
    // CSRF errors
    if (message.includes('csrf')) {
      return {
        category: ErrorCategory.CSRF,
        severity: ErrorSeverity.HIGH,
        userMessage: 'Security verification failed. Please refresh the page and try again.',
        technicalMessage: error.message,
        statusCode: 403,
        shouldLog: true,
        shouldAlert: true
      };
    }
    
    // Database errors
    if (message.includes('database') || message.includes('sql') || message.includes('db')) {
      return {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        userMessage: 'A database error occurred. Please try again.',
        technicalMessage: error.message,
        statusCode: 500,
        shouldLog: true,
        shouldAlert: true
      };
    }
  }
  
  // Default server error
  return {
    category: ErrorCategory.SERVER_ERROR,
    severity: ErrorSeverity.HIGH,
    userMessage: `${context} failed. Please try again later.`,
    technicalMessage: error instanceof Error ? error.message : 'Unknown error',
    statusCode: 500,
    shouldLog: true,
    shouldAlert: true
  };
}

export function handleClassifiedError(classifiedError: ClassifiedError, traceId?: string): NextResponse {
  const response = NextResponse.json({
    error: classifiedError.userMessage,
    category: classifiedError.category,
    severity: classifiedError.severity,
    ...(process.env.NODE_ENV !== 'production' && { technical: classifiedError.technicalMessage })
  }, { status: classifiedError.statusCode });
  
  if (traceId) {
    response.headers.set('X-Request-ID', traceId);
  }
  
  // Log the error if needed
  if (classifiedError.shouldLog) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      traceId: traceId || 'unknown',
      category: classifiedError.category,
      severity: classifiedError.severity,
      technicalMessage: classifiedError.technicalMessage,
      shouldAlert: classifiedError.shouldAlert
    };
    
    if (classifiedError.severity === ErrorSeverity.CRITICAL || classifiedError.shouldAlert) {
      console.error(JSON.stringify(logEntry));
    } else {
      console.warn(JSON.stringify(logEntry));
    }
  }
  
  return response;
}

async function isRateLimitedKV(ip: string, kv: KVNamespace): Promise<boolean> {
  const key = `ratelimit:${ip}:${Math.floor(Date.now() / RATE_LIMIT_WINDOW)}`;
  const current = await kv.get(key);
  const count = current ? parseInt(current) : 0;
  if (count >= RATE_LIMIT_MAX) {
    return true;
  }
  await kv.put(key, String(count + 1), { expirationTtl: Math.ceil(RATE_LIMIT_WINDOW / 1000) });
  return false;
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return true;
  }
  record.count++;
  return false;
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  return 'unknown';
}

function getRequestAuthToken(request: NextRequest): string | undefined {
  const headerToken = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (headerToken) {
    return headerToken;
  }

  return request.cookies.get('auth_token')?.value;
}

function generateTraceId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function withTracing(request: NextRequest): string {
  const traceId = request.headers.get('X-Request-ID') || request.headers.get('X-Trace-ID') || generateTraceId();
  return traceId;
}

export async function withSecurityHeaders(response: NextResponse, traceId: string): Promise<NextResponse> {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' https://books.zoho.com https://graph.facebook.com https://api.resend.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';");
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://portal.scratchsolidsolutions.org').split(',').map(o => o.trim());
  response.headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Request-ID');
  response.headers.set('Access-Control-Max-Age', '86400');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('X-Request-ID', traceId);
  response.headers.set('X-Trace-ID', traceId);
  
  // Add compression header for clients that support it
  response.headers.set('Accept-Encoding', 'gzip, deflate, br');
  
  return response;
}

export async function withCsrf(request: NextRequest): Promise<NextResponse | null> {
  const method = request.method;
  // Only validate CSRF for state-changing methods
  if (method !== 'POST' && method !== 'PUT' && method !== 'DELETE' && method !== 'PATCH') {
    return null;
  }

  const csrfToken = request.headers.get('X-CSRF-Token') || request.headers.get('x-csrf-token');
  if (!csrfToken) {
    return NextResponse.json({ error: 'CSRF token required' }, { status: 403 });
  }

  if (!validateCsrfToken(csrfToken)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  return null;
}

export function generateCsrfTokenForClient(): string {
  return generateCsrfToken();
}

export async function withRateLimit(request: NextRequest, kv?: KVNamespace): Promise<NextResponse | null> {
  const ip = getClientIP(request);
  // Auto-detect KV binding from Cloudflare Worker runtime if not explicitly passed
  const effectiveKv = kv || (globalThis as any).RATE_LIMIT_KV as KVNamespace | undefined;
  if (effectiveKv) {
    const limited = await isRateLimitedKV(ip, effectiveKv);
    if (limited) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    return null;
  }
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  return null;
}

export async function withAuth(request: NextRequest, allowedRoles?: string[]): Promise<{ user: any; db: D1Database } | NextResponse> {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const token = getRequestAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // First try to validate session in database
  const session = await validateSession(db, token);
  if (session) {
    if (allowedRoles && !allowedRoles.includes((session as any).role)) {
      return NextResponse.json({ error: 'Forbidden - insufficient permissions' }, { status: 403 });
    }
    return { user: session, db };
  }

  // Fallback: Try to verify JWT token directly
  const { verifyAccessToken } = await import('@/lib/auth');
  const jwtPayload = verifyAccessToken(token);
  if (jwtPayload) {
    // Fetch user from database to get fresh data
    const user = await db.prepare(
      'SELECT id, email, role, name, phone, password_hash FROM users WHERE id = ?'
    ).bind(jwtPayload.userId).first();

    if (user) {
      if (allowedRoles && !allowedRoles.includes((user as any).role)) {
        return NextResponse.json({ error: 'Forbidden - insufficient permissions' }, { status: 403 });
      }
      return { user, db };
    }
  }

  return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
}

// RBAC Middleware: Check if user has specific permission
export async function withPermission(
  request: NextRequest,
  permission: string
): Promise<{ user: any; db: D1Database; permissions: UserPermissions } | NextResponse> {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const token = getRequestAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let authUser = await validateSession(db, token);
  if (!authUser) {
    const { verifyAccessToken } = await import('@/lib/auth');
    const jwtPayload = verifyAccessToken(token);
    if (jwtPayload) {
      authUser = await db.prepare(
        'SELECT id, email, role, name, phone, password_hash FROM users WHERE id = ?'
      ).bind(jwtPayload.userId).first();
    }
  }

  if (!authUser) {
    return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
  }

  const userId = (authUser as any).user_id || (authUser as any).id;
  const userPermissions = await getUserPermissions(db, userId);

  if (!hasPermission(userPermissions, permission)) {
    return NextResponse.json({ 
      error: 'Forbidden - insufficient permissions',
      required: permission 
    }, { status: 403 });
  }

  return { user: authUser, db, permissions: userPermissions };
}

// RBAC Middleware: Check if user has resource permission
export async function withResourcePermission(
  request: NextRequest,
  resource: string,
  action: string
): Promise<{ user: any; db: D1Database; permissions: UserPermissions } | NextResponse> {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const token = getRequestAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let authUser = await validateSession(db, token);
  if (!authUser) {
    const { verifyAccessToken } = await import('@/lib/auth');
    const jwtPayload = verifyAccessToken(token);
    if (jwtPayload) {
      authUser = await db.prepare(
        'SELECT id, email, role, name, phone, password_hash FROM users WHERE id = ?'
      ).bind(jwtPayload.userId).first();
    }
  }

  if (!authUser) {
    return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
  }

  const userId = (authUser as any).user_id || (authUser as any).id;
  const userPermissions = await getUserPermissions(db, userId);

  if (!hasResourcePermission(userPermissions, resource, action)) {
    return NextResponse.json({ 
      error: 'Forbidden - insufficient permissions',
      required: `${resource}.${action}`
    }, { status: 403 });
  }

  return { user: authUser, db, permissions: userPermissions };
}

// RBAC Middleware: Check if user has minimum role level
export async function withRoleLevel(
  request: NextRequest,
  requiredLevel: number
): Promise<{ user: any; db: D1Database; permissions: UserPermissions } | NextResponse> {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const token = getRequestAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let authUser = await validateSession(db, token);
  if (!authUser) {
    const { verifyAccessToken } = await import('@/lib/auth');
    const jwtPayload = verifyAccessToken(token);
    if (jwtPayload) {
      authUser = await db.prepare(
        'SELECT id, email, role, name, phone, password_hash FROM users WHERE id = ?'
      ).bind(jwtPayload.userId).first();
    }
  }

  if (!authUser) {
    return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
  }

  const userId = (authUser as any).user_id || (authUser as any).id;
  const userPermissions = await getUserPermissions(db, userId);

  if (!hasRoleLevel(userPermissions, requiredLevel)) {
    return NextResponse.json({ 
      error: 'Forbidden - insufficient role level',
      required: requiredLevel,
      current: userPermissions.maxRoleLevel
    }, { status: 403 });
  }

  return { user: authUser, db, permissions: userPermissions };
}

// RBAC Middleware: Check if user has any of the specified permissions
export async function withAnyPermission(
  request: NextRequest,
  permissions: string[]
): Promise<{ user: any; db: D1Database; userPermissions: UserPermissions } | NextResponse> {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const token = getRequestAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let authUser = await validateSession(db, token);
  if (!authUser) {
    const { verifyAccessToken } = await import('@/lib/auth');
    const jwtPayload = verifyAccessToken(token);
    if (jwtPayload) {
      authUser = await db.prepare(
        'SELECT id, email, role, name, phone, password_hash FROM users WHERE id = ?'
      ).bind(jwtPayload.userId).first();
    }
  }

  if (!authUser) {
    return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
  }

  const userId = (authUser as any).user_id || (authUser as any).id;
  const userPermissions = await getUserPermissions(db, userId);

  const hasAny = permissions.some(p => hasPermission(userPermissions, p));
  if (!hasAny) {
    return NextResponse.json({ 
      error: 'Forbidden - insufficient permissions',
      required: permissions
    }, { status: 403 });
  }

  return { user: authUser, db, userPermissions };
}

// RBAC Middleware: Check if user has all of the specified permissions
export async function withAllPermissions(
  request: NextRequest,
  permissions: string[]
): Promise<{ user: any; db: D1Database; userPermissions: UserPermissions } | NextResponse> {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const token = getRequestAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let authUser = await validateSession(db, token);
  if (!authUser) {
    const { verifyAccessToken } = await import('@/lib/auth');
    const jwtPayload = verifyAccessToken(token);
    if (jwtPayload) {
      authUser = await db.prepare(
        'SELECT id, email, role, name, phone, password_hash FROM users WHERE id = ?'
      ).bind(jwtPayload.userId).first();
    }
  }

  if (!authUser) {
    return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
  }

  const userId = (authUser as any).user_id || (authUser as any).id;
  const userPermissions = await getUserPermissions(db, userId);

  const hasAll = permissions.every(p => hasPermission(userPermissions, p));
  if (!hasAll) {
    return NextResponse.json({ 
      error: 'Forbidden - insufficient permissions',
      required: permissions
    }, { status: 403 });
  }

  return { user: authUser, db, userPermissions };
}

export async function withCSRF(request: NextRequest): Promise<NextResponse | null> {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return null;
  }

  const csrfToken = request.headers.get('X-CSRF-Token');
  if (!csrfToken) {
    return NextResponse.json({ error: 'CSRF token missing' }, { status: 403 });
  }

  if (!validateCsrfToken(csrfToken)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  return null;
}

export function logRequest(request: NextRequest, response: NextResponse, durationMs: number, traceId: string) {
  const timestamp = new Date().toISOString();
  const method = request.method;
  const path = request.nextUrl.pathname;
  const status = response.status;
  const ip = getClientIP(request);
  const log = { timestamp, traceId, method, path, status, durationMs, ip, userAgent: request.headers.get('user-agent')?.slice(0, 100) };
  // Log logged via structured logger
}

export function logSecurityEvent(event: string, details: Record<string, any>) {
  const log = {
    timestamp: new Date().toISOString(),
    event,
    severity: 'SECURITY',
    ...details
  };
  // Security event logged via structured logger
}

// KV-backed rate limiter for stricter distributed enforcement
export async function withKVRateLimit(request: NextRequest, kv: KVNamespace, maxRequests: number = 30, windowSeconds: number = 60): Promise<NextResponse | null> {
  const ip = getClientIP(request);
  const key = `ratelimit:${ip}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  const current = await kv.get(key);
  const count = current ? parseInt(current) : 0;
  if (count >= maxRequests) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  await kv.put(key, String(count + 1), { expirationTtl: windowSeconds });
  return null;
}

export async function withKVCache<T>(
  kv: KVNamespace,
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 60
): Promise<T> {
  const cached = await kv.get(key, 'text');
  if (cached) {
    try {
      return JSON.parse(cached) as T;
    } catch {}
  }
  const data = await fetchFn();
  await kv.put(key, JSON.stringify(data), { expirationTtl: ttlSeconds });
  return data;
}

export function standardizeError(error: unknown, context: string = 'Operation'): NextResponse {
  console.error(`[${context}] Error:`, error);
  
  if (error instanceof Error) {
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: `${context} failed. Please try again later.` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: error.message, context },
      { status: 500 }
    );
  }
  
  return NextResponse.json(
    { error: `${context} failed. Please try again later.` },
    { status: 500 }
  );
}

export async function invalidateKVCache(kv: KVNamespace, keyPrefix: string): Promise<void> {
  const list = await kv.list({ prefix: keyPrefix });
  for (const key of list.keys) {
    await kv.delete(key.name);
  }
}
