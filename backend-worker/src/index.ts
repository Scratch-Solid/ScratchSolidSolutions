/**
 * Cloudflare Workers FastAPI Backend
 * Full backend implementation using D1 database
 */

import { Router } from 'itty-router';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import jwt from '@tsndr/cloudflare-worker-jwt';
import bcrypt from 'bcryptjs';
import DataRetentionCleanup from './data-retention';
import {
  cleanupPortalExpiredData,
  cleanupTrainingExpiredData,
} from './portal-data-retention';
import { handleHardDeleteAccounts } from './hard-delete-accounts';
import { handleOverdueCancellations } from './overdue-cancellation';
import { handleRetentionPolicies } from './retention-policies';
import { queueHandler } from './queue-consumer';
import { setDbInstance } from './lib/db';
import { setEnvInstance } from './lib/zoho';
import {
  initializeTransaction,
  verifyTransaction,
  processWebhookEvent,
  verifyWebhookSignature,
  refundTransaction,
  listRefunds,
  generatePaystackReference,
} from './lib/paystack';

const router = Router();

// ... existing helper functions and routes ...
// (I will use multi_edit or a large edit for this)


// Helper function to get database session for read operations
function getReadSession(env) {
  return env.scratchsolid_db.withSession("first-unconstrained");
}

// Helper function to get database session for consistent reads
function getConsistentReadSession(env) {
  return env.scratchsolid_db.withSession("first-primary");
}

// Email helper function using Resend API
async function sendEmail(env: any, { to, subject, html, replyTo }: { to: string, subject: string, html: string, replyTo?: string }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ScratchSolid <customerservice@scratchsolidsolutions.org>',
      to,
      subject,
      html,
      replyTo: replyTo || 'it@scratchsolidsolutions.org',
    }),
  });
  return response.json();
}

// Booking confirmation email
async function sendBookingConfirmation(env, { to, clientName, bookingDate, bookingTime, location, serviceType }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .detail { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #2563eb; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Scratch Solid Solutions</h1>
        </div>
        <div class="content">
          <h2>Booking Confirmed!</h2>
          <p>Dear ${clientName},</p>
          <p>Your booking has been confirmed. Here are the details:</p>
          <div class="detail">
            <strong>Date:</strong> ${bookingDate}<br>
            <strong>Time:</strong> ${bookingTime}<br>
            <strong>Location:</strong> ${location}<br>
            <strong>Service:</strong> ${serviceType}
          </div>
          <p>Please ensure the location is accessible at the scheduled time. Our team will arrive on time to provide excellent service.</p>
          <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Scratch Solid Solutions. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(env, {
    to,
    subject: 'Booking Confirmed - Scratch Solid Solutions',
    html,
  });
}

// Payment receipt email
async function sendPaymentReceipt(env, { to, clientName, amount, paymentDate, bookingId }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .receipt { background: white; padding: 20px; margin: 20px 0; border-radius: 6px; border: 2px solid #10b981; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Receipt</h1>
        </div>
        <div class="content">
          <h2>Payment Successful</h2>
          <p>Dear ${clientName},</p>
          <p>Your payment has been successfully processed. Here is your receipt:</p>
          <div class="receipt">
            <strong>Receipt ID:</strong> ${bookingId}<br>
            <strong>Amount:</strong> R ${amount.toFixed(2)}<br>
            <strong>Date:</strong> ${paymentDate}<br>
            <strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">PAID</span>
          </div>
          <p>Thank you for your payment. Please keep this receipt for your records.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Scratch Solid Solutions. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(env, {
    to,
    subject: 'Payment Receipt - Scratch Solid Solutions',
    html,
  });
}

// Admin alert email for new bookings
async function sendAdminAlert(env, { clientName, bookingDate, bookingTime, location, serviceType, clientEmail }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .detail { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #dc2626; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Booking Alert</h1>
        </div>
        <div class="content">
          <h2>New Booking Received</h2>
          <p>A new booking has been submitted. Details:</p>
          <div class="detail">
            <strong>Client:</strong> ${clientName}<br>
            <strong>Email:</strong> ${clientEmail}<br>
            <strong>Date:</strong> ${bookingDate}<br>
            <strong>Time:</strong> ${bookingTime}<br>
            <strong>Location:</strong> ${location}<br>
            <strong>Service:</strong> ${serviceType}
          </div>
          <p>Please review and confirm this booking in the admin dashboard.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Scratch Solid Solutions. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(env, {
    to: 'it@scratchsolidsolutions.org',
    subject: 'New Booking Alert - Scratch Solid Solutions',
    html,
    replyTo: 'customerservice@scratchsolidsolutions.org',
  });
}

// CORS middleware - restrict to known origins only
const PRODUCTION_ORIGINS = [
  'https://scratchsolidsolutions.org',
  'https://portal.scratchsolidsolutions.org',
  'https://www.scratchsolidsolutions.org',
  'https://scratchsolid.com',
  'https://portal.scratchsolid.com',
  'https://www.scratchsolid.com'
];

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8787'
];

function getAllowedOrigins(env: any) {
  const isDev = env.ENVIRONMENT === 'development' || env.ENVIRONMENT === 'staging';
  return isDev ? [...PRODUCTION_ORIGINS, ...DEV_ORIGINS] : PRODUCTION_ORIGINS;
}

function getCorsHeaders(request, env?: any) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = env ? getAllowedOrigins(env) : PRODUCTION_ORIGINS;
  const allowed = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

// JWT utilities
function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function createToken(userId: number, role: string, env: any) {
  const now = Math.floor(Date.now() / 1000);
  const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const payload = JSON.stringify({ sub: String(userId), role, iat: now, exp: now + 900 });

  const headerB64 = bytesToBase64Url(new TextEncoder().encode(header));
  const payloadB64 = bytesToBase64Url(new TextEncoder().encode(payload));
  const partialToken = `${headerB64}.${payloadB64}`;

  const secretBytes = new TextEncoder().encode(env.JWT_SECRET);
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(partialToken));
  const signatureB64 = bytesToBase64Url(new Uint8Array(signature));

  return `${partialToken}.${signatureB64}`;
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
  const binary = atob(padded);
  return new Uint8Array(binary.length).map((_, i) => binary.charCodeAt(i));
}

async function verifyJwtSignature(token: string, secret: string): Promise<boolean> {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) {
    console.error('[verifyJwtSignature] malformed token');
    return false;
  }

  const data = new TextEncoder().encode(`${header}.${payload}`);
  const secretBytes = new TextEncoder().encode(secret);

  console.error('[verifyJwtSignature] secret length:', secretBytes.length, 'data length:', data.length);

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const computed = await crypto.subtle.sign('HMAC', key, data);
  const computedBytes = new Uint8Array(computed);
  const signatureBytes = base64UrlToBytes(signature);

  console.error('[verifyJwtSignature] computed sig length:', computedBytes.length, 'provided sig length:', signatureBytes.length);

  if (computedBytes.length !== signatureBytes.length) {
    console.error('[verifyJwtSignature] length mismatch');
    return false;
  }
  let match = 0;
  for (let i = 0; i < computedBytes.length; i++) {
    match |= computedBytes[i] ^ signatureBytes[i];
  }
  const result = match === 0;
  console.error('[verifyJwtSignature] signature valid:', result);
  return result;
}

async function verifyToken(request: any, env: any) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const isValid = await verifyJwtSignature(token, env.JWT_SECRET);
    if (!isValid) {
      console.error('[verifyToken] signature verification failed');
      return null;
    }
    const decoded = jwt.decode(token);
    const payload = decoded?.payload;
    // Reject expired tokens explicitly
    if (payload?.exp && Date.now() / 1000 > payload.exp) {
      console.error('[verifyToken] token expired, exp:', payload.exp, 'now:', Date.now() / 1000);
      return null;
    }
    return payload;
  } catch (error: any) {
    console.error('[verifyToken] error:', error?.message || error);
    return null;
  }
}

// User authentication using bcrypt (standardized across all projects)
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password, storedHash) {
  // Support legacy PBKDF2 hashes for migration
  if (storedHash.startsWith('pbkdf2:')) {
    const [, , saltHex, expectedHash] = storedHash.split(':');
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const derivedBits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: encoder.encode(saltHex), iterations: 100000, hash: 'SHA-256' },
      keyMaterial, 256
    );
    const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === expectedHash;
  }
  // Support legacy SHA256 hashes for migration
  if (!storedHash.startsWith('$2a$') && !storedHash.startsWith('$2b$')) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt');
    const hashBuffer = sha256(data);
    const legacyHash = bytesToHex(hashBuffer);
    return legacyHash === storedHash;
  }
  // Use bcrypt for new hashes
  return await bcrypt.compare(password, storedHash);
}

// Database helpers
async function createUser(db, userData) {
  const hashedPassword = await hashPassword(userData.password);
  const result = await db.prepare(`
    INSERT INTO users (role, name, email, password_hash, phone, address, business_name, business_info, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    userData.role || 'client',
    userData.name,
    userData.email,
    hashedPassword,
    userData.phone || '',
    userData.address || '',
    userData.business_name || '',
    userData.business_info || ''
  ).run();
  
  return result.meta.last_row_id;
}

async function findUserByEmail(db, email) {
  return await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
}

// Routes
router.options('*', (request) => new Response(null, { headers: getCorsHeaders(request) }));

// Health check (no auth required)
router.get('/api/health', async (request, env) => {
  const checks: Record<string, string> = {};
  let overall = 'ok';

  // D1 check
  try {
    await env.scratchsolid_db.prepare("SELECT 1").first();
    checks.d1 = 'ok';
  } catch (e) {
    checks.d1 = 'error';
    overall = 'degraded';
  }

  // Resend check (verify API key is valid without sending an email)
  try {
    const res = await fetch('https://api.resend.com/api-keys', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}` }
    });
    checks.resend = res.status === 401 ? 'unauthorized' : res.ok ? 'ok' : 'error';
    if (checks.resend === 'unauthorized' || checks.resend === 'error') { overall = 'degraded'; }
  } catch (e) {
    checks.resend = 'error';
    overall = 'degraded';
  }

  // Zoho check — optional (invoices fall back to local DB if unavailable)
  try {
    const dc = (env.ZOHO_DC || 'com').replace(/^\./, '');
    const accountsUrl = `https://accounts.zoho.${dc}`;
    const tokenRes = await fetch(`${accountsUrl}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: env.ZOHO_REFRESH_TOKEN,
        client_id: env.ZOHO_CLIENT_ID,
        client_secret: env.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token'
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => '');
      console.error('[health] Zoho token exchange failed:', tokenRes.status, errText);
      checks.zoho = tokenRes.status === 401 || errText.includes('invalid_token') ? 'token_expired' : 'error';
      // Zoho is optional — don't degrade overall status
    } else {
      const tokenData = await tokenRes.json() as { access_token: string; error?: string };
      if (tokenData.error) {
        console.error('[health] Zoho token exchange error:', tokenData.error);
        checks.zoho = 'token_expired';
        // Zoho is optional — don't degrade overall status
      } else {
        // Verify token works using Zoho Books API (books scope doesn't include userinfo)
        const booksUrl = `https://books.zoho.${dc}/api/v3`;
        const orgRes = await fetch(`${booksUrl}/organizations`, {
          headers: {
            'Authorization': `Zoho-oauthtoken ${tokenData.access_token}`,
            'X-com-zoho-books-organizationid': env.ZOHO_ORG_ID
          }
        });
        checks.zoho = orgRes.ok ? 'ok' : orgRes.status === 401 ? 'token_expired' : 'error';
        // Zoho is optional — don't degrade overall status
      }
    }
  } catch (e) {
    checks.zoho = 'error';
    // Zoho is optional — don't degrade overall status
  }

  return new Response(JSON.stringify({
    status: overall,
    service: 'cloudflare-worker',
    version: '2.0.0',
    checks,
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
  });
});

// Auth endpoints
function sanitizeInput(input: string | undefined): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

router.post('/api/auth/signup', async (request: any, env: any) => {
  try {
    const body = await request.json() as any;
    const name = sanitizeInput(body.name);
    const email = (body.email || '').toLowerCase().trim();
    const password = body.password;
    const role = sanitizeInput(body.role) || 'client';
    const phone = sanitizeInput(body.phone);
    const address = sanitizeInput(body.address);
    const business_name = sanitizeInput(body.business_name);
    const business_info = sanitizeInput(body.business_info);

    if (!email || !password || password.length < 8) {
      return new Response(JSON.stringify({ error: 'Valid email and password (min 8 chars) required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }

    if (!name || name.length < 2) {
      return new Response(JSON.stringify({ error: 'Name is required (min 2 chars)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }

    // Check if user exists
    const existingUser = await findUserByEmail(env.scratchsolid_db, email);
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }
    
    // Create user
    const userId = await createUser(env.scratchsolid_db, {
      name, email, password, role, phone, address, business_name, business_info
    });
    
    const token = await createToken(userId, role, env);
    
    return new Response(JSON.stringify({ 
      access_token: token, 
      token_type: 'bearer',
      user: { id: userId, name, email, role }
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error: any) {
    console.error('[signup] error:', error?.message || error);
    return new Response(JSON.stringify({ error: 'Signup failed', detail: error?.message || String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.post('/api/auth/login', async (request: any, env: any) => {
  try {
    const { email, password } = await request.json() as any;
    
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }
    
    const user = await findUserByEmail(env.scratchsolid_db, email);
    if (!user || !await verifyPassword(password, user.password_hash)) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }
    
    const token = await createToken(user.id, user.role, env);
    
    return new Response(JSON.stringify({ 
      access_token: token, 
      token_type: 'bearer',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error: any) {
    console.error('[login] error:', error?.message || error);
    return new Response(JSON.stringify({ error: 'Login failed', detail: error?.message || String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Get current user
router.get('/api/auth/me', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  const db = getReadSession(env);
  const user = await db.prepare('SELECT id, name, email, role FROM users WHERE id = ?')
    .bind(parseInt(payload.sub)).first();
    
  return new Response(JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
  });
});

// Bookings endpoints
router.post('/api/bookings', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { user_id, booking_type, cleaning_type, payment_method, start_time, end_time, special_instructions } = await request.json() as any;
    const effectiveUserId = payload.role === 'admin' && user_id ? user_id : payload.sub;
    
    const result = await env.scratchsolid_db.prepare(`
      INSERT INTO bookings (user_id, booking_type, cleaning_type, payment_method, start_time, end_time, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).bind(effectiveUserId, booking_type, cleaning_type, payment_method, start_time, end_time).run();
    
    return new Response(JSON.stringify({ 
      id: result.meta.last_row_id,
      message: 'Booking created successfully'
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Booking creation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.get('/api/bookings', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  const url = new URL(request.url);
  const requestedUserId = url.searchParams.get('user_id');
  const effectiveUserId = payload.role === 'admin' && requestedUserId ? parseInt(requestedUserId, 10) : payload.sub;
  
  const db = getReadSession(env);
  const bookings = await db.prepare(`
    SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC
  `).bind(effectiveUserId).all();
    
  return new Response(JSON.stringify(bookings.results || bookings), {
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
  });
});

router.delete('/api/bookings/:id', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  const { id } = request.params;
  
  // Verify booking belongs to user
  const db = getReadSession(env);
  const booking = await db.prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?')
    .bind(id, payload.sub).first();
    
  if (!booking) {
    return new Response(JSON.stringify({ error: 'Booking not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  await env.scratchsolid_db.prepare('UPDATE bookings SET status = ? WHERE id = ?')
    .bind('cancelled', id).run();
    
  return new Response(JSON.stringify({ message: 'Booking cancelled' }), {
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
  });
});

// Templates endpoints
router.post('/api/templates', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { name, content } = await request.json() as any;
    
    const result = await env.scratchsolid_db.prepare(`
      INSERT INTO templates (name, content, created_at)
      VALUES (?, ?, datetime('now'))
    `).bind(name, content).run();
    
    return new Response(JSON.stringify({ 
      id: result.meta.last_row_id,
      name, content,
      message: 'Template created successfully'
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Template creation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.get('/api/templates', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  const db = getReadSession(env);
  const templates = await db.prepare('SELECT * FROM templates ORDER BY created_at DESC').all();
  
  return new Response(JSON.stringify(templates.results || templates), {
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
  });
});

// Contracts endpoints
router.post('/api/contracts', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload || (payload.role !== 'business' && payload.role !== 'admin')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { business_id, duration, template_id } = await request.json() as any;
    const effectiveBusinessId = payload.role === 'admin' ? business_id : payload.sub;
    
    const db = getReadSession(env);
    const template = await db.prepare('SELECT content FROM templates WHERE id = ?').bind(template_id).first();
    
    const result = await env.scratchsolid_db.prepare(`
      INSERT INTO contracts (business_id, duration, rate, template_id, immutable, created_at)
      VALUES (?, ?, 0, ?, TRUE, datetime('now'))
    `).bind(effectiveBusinessId, duration, template_id).run();
    
    return new Response(JSON.stringify({ 
      id: result.meta.last_row_id,
      business_id, duration,
      template_id,
      template_content: template?.content,
      immutable: true,
      message: 'Contract created successfully'
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Contract creation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.get('/api/contracts/:id', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload || payload.role !== 'business') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { id } = request.params;
    const db = getReadSession(env);
    const contract = await db.prepare(`
      SELECT c.*, t.name as template_name, t.content as template_content
      FROM contracts c
      LEFT JOIN templates t ON c.template_id = t.id
      WHERE c.business_id = ? AND c.id = ?
    `).bind(payload.sub, id).first();
    
    if (!contract) {
      return new Response(JSON.stringify({ error: 'Contract not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }
    
    return new Response(JSON.stringify(contract), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to fetch contract: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.put('/api/contracts/:id/rate', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { id } = request.params;
    const { rate } = await request.json() as any;
    
    const result = await env.scratchsolid_db.prepare('UPDATE contracts SET rate = ? WHERE id = ?').bind(rate, id).run();
    
    return new Response(JSON.stringify({ 
      message: 'Contract rate updated successfully',
      id,
      rate
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to update contract rate: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.get('/api/contracts/:id/export', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload || payload.role !== 'business') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { id } = request.params;
    const db = getReadSession(env);
    const contract = await db.prepare(`
      SELECT c.*, t.name as template_name, t.content as template_content
      FROM contracts c
      LEFT JOIN templates t ON c.template_id = t.id
      WHERE c.business_id = ? AND c.id = ?
    `).bind(payload.sub, id).first();
    
    if (!contract) {
      return new Response(JSON.stringify({ error: 'Contract not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }
    
    // Simple PDF export (in production, use proper PDF library)
    const pdfContent = `
      Contract #${contract.id}
      
      Template: ${contract.template_name}
      
      Duration: ${contract.duration} years
      
      Rate: R${contract.rate}/hour
      
      This is an immutable contract.
    `;
    
    return new Response(pdfContent, {
      headers: { 'Content-Type': 'text/plain', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to export contract: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Payments endpoints
router.post('/api/payments', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { booking_id, method, amount } = await request.json() as any;
    
    const result = await env.scratchsolid_db.prepare(`
      INSERT INTO payments (booking_id, method, amount, confirmed, created_at)
      VALUES (?, ?, ?, false, datetime('now'))
    `).bind(booking_id, method, amount).run();
    
    // Log payment intent for Zoho integration
    console.log(JSON.stringify({
      event: 'payment-intent',
      booking_id,
      method,
      amount,
      user_id: payload.sub,
      timestamp: new Date().toISOString()
    }));
    
    return new Response(JSON.stringify({ 
      id: result.meta.last_row_id,
      booking_id, method, amount,
      confirmed: false,
      message: 'Payment recorded successfully'
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Payment recording failed: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.put('/api/payments/:id/confirm', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { id } = request.params;
    
    const result = await env.scratchsolid_db.prepare('UPDATE payments SET confirmed = TRUE WHERE id = ?').bind(id).run();
    
    return new Response(JSON.stringify({ 
      message: 'Payment confirmed successfully',
      id,
      confirmed: true
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to confirm payment: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Paystack payment initialization
router.post('/api/payments/paystack/initialize', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }

  try {
    const { booking_id, email, amount, callback_url } = await request.json() as any;

    if (!booking_id || !email || !amount) {
      return new Response(JSON.stringify({ error: 'booking_id, email, and amount are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }

    // Verify booking exists and belongs to user
    const db = getReadSession(env);
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?')
      .bind(booking_id, payload.sub).first();

    if (!booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }

    // Check if payment already initiated
    const existingPayment = await db.prepare('SELECT * FROM payments WHERE booking_id = ? AND gateway = ? AND status IN (?, ?)')
      .bind(booking_id, 'paystack', 'pending', 'processing').first();

    if (existingPayment) {
      return new Response(JSON.stringify({
        message: 'Payment already initiated',
        reference: existingPayment.external_payment_id,
        authorization_url: null // Would need to reconstruct or tell frontend to check status
      }), {
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }

    const reference = generatePaystackReference(booking_id);

    // Initialize Paystack transaction
    const initResult = await initializeTransaction(env, {
      email,
      amount: Math.round(amount * 100), // Convert ZAR to kobo
      reference,
      callback_url,
      metadata: {
        booking_id: String(booking_id),
        user_id: payload.sub,
        service_type: (booking as any).cleaning_type || 'cleaning',
      },
    });

    if (!initResult.status || !initResult.data) {
      return new Response(JSON.stringify({
        error: 'Paystack initialization failed',
        detail: initResult.message
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }

    // Record payment intent in database
    await env.scratchsolid_db.prepare(`
      INSERT INTO payments (booking_id, amount, currency, status, external_payment_id, gateway, metadata, created_at)
      VALUES (?, ?, 'ZAR', 'pending', ?, 'paystack', ?, datetime('now'))
    `).bind(
      booking_id,
      amount,
      reference,
      JSON.stringify({ authorization_url: initResult.data.authorization_url, email })
    ).run();

    // Update booking status to awaiting_payment
    await env.scratchsolid_db.prepare(`
      UPDATE bookings SET status = 'awaiting_payment', updated_at = datetime('now') WHERE id = ?
    `).bind(booking_id).run();

    return new Response(JSON.stringify({
      status: 'pending',
      reference: initResult.data.reference,
      authorization_url: initResult.data.authorization_url,
      access_code: initResult.data.access_code,
      message: 'Payment initialized. Redirect client to authorization_url.',
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error: any) {
    console.error('[paystack initialize] error:', error?.message || error);
    return new Response(JSON.stringify({ error: 'Paystack initialization failed', detail: error?.message || String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Paystack webhook endpoint (no auth — verified by signature)
router.post('/api/webhooks/paystack', async (request: any, env: any) => {
  try {
    const signature = request.headers.get('x-paystack-signature') || '';
    const bodyText = await request.text();

    // Verify webhook signature — ALWAYS enforce in production
    if (!env.PAYSTACK_SECRET_KEY) {
      console.error('[paystack webhook] PAYSTACK_SECRET_KEY not configured — rejecting webhook');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (!signature) {
      console.error('[paystack webhook] Missing x-paystack-signature header — rejecting');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const isValid = await verifyWebhookSignature(env.PAYSTACK_SECRET_KEY, signature, bodyText);
    if (!isValid) {
      console.error('[paystack webhook] Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = JSON.parse(bodyText);
    const event = processWebhookEvent(body);

    console.log('[paystack webhook] Received event:', event.event, 'reference:', event.reference);

    // Handle refund events
    if (event.event === 'refund.processed' && event.reference) {
      const db = getReadSession(env);
      const payment = await db.prepare('SELECT * FROM payments WHERE external_payment_id = ?')
        .bind(event.reference).first();
      if (payment) {
        const refundAmount = event.amount ? event.amount / 100 : (payment as any).amount;
        await env.scratchsolid_db.prepare(`
          UPDATE payments
          SET status = 'refunded',
              refunded_amount = ?,
              refunded_at = datetime('now'),
              updated_at = datetime('now')
          WHERE id = ?
        `).bind(refundAmount, (payment as any).id).run();
        console.log('[paystack webhook] Refund processed for payment:', (payment as any).id);
      }
      return new Response(JSON.stringify({ status: 'acknowledged', event: event.event }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle failed transaction events
    if (event.event === 'charge.failed' && event.reference) {
      const db = getReadSession(env);
      const payment = await db.prepare('SELECT * FROM payments WHERE external_payment_id = ?')
        .bind(event.reference).first();
      if (payment && (payment as any).status === 'pending') {
        await env.scratchsolid_db.prepare(`
          UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?
        `).bind((payment as any).id).run();
      }
      return new Response(JSON.stringify({ status: 'acknowledged', event: event.event }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!event.isChargeSuccess || !event.reference) {
      // Acknowledge non-success events but take no action
      return new Response(JSON.stringify({ status: 'acknowledged', event: event.event }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find the payment record
    const db = getReadSession(env);
    const payment = await db.prepare('SELECT * FROM payments WHERE external_payment_id = ?')
      .bind(event.reference).first();

    if (!payment) {
      console.error('[paystack webhook] Payment not found for reference:', event.reference);
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const bookingId = (payment as any).booking_id;

    // Update payment status to completed
    const metadata = (payment as any).metadata || '{}';
    let metaObj: any;
    try { metaObj = JSON.parse(metadata); } catch (e) { metaObj = {}; }
    metaObj.paystack_event = event.event;
    metaObj.paid_at = event.data?.paid_at;
    metaObj.channel = event.data?.channel;
    metaObj.paystack_customer = event.data?.customer;

    await env.scratchsolid_db.prepare(`
      UPDATE payments
      SET status = 'completed',
          payment_date = datetime('now'),
          metadata = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(JSON.stringify(metaObj), (payment as any).id).run();

    // Confirm the booking
    await env.scratchsolid_db.prepare(`
      UPDATE bookings
      SET status = 'confirmed',
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(bookingId).run();

    // Fetch booking details for Zoho integration
    const booking = await db.prepare(`
      SELECT b.*, u.name as client_name, u.email as client_email, u.phone as client_phone
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `).bind(bookingId).first();

    if (booking) {
      const b = booking as any;
      console.log('[paystack webhook] Booking confirmed:', bookingId);

      // Send booking confirmation email
      try {
        await sendBookingConfirmation(env, {
          to: b.client_email,
          clientName: b.client_name,
          bookingDate: b.start_time,
          bookingTime: b.end_time,
          location: b.location || 'TBD',
          serviceType: b.cleaning_type || 'Cleaning',
        });
      } catch (e) {
        console.error('[paystack webhook] Failed to send confirmation email:', e);
      }

      // Push to Zoho Books (best-effort)
      try {
        const { createInvoice, recordPayment, createCustomer, findCustomerByEmail } = await import('./lib/zoho');
        setEnvInstance(env);

        // Find or create customer in Zoho
        let zohoCustomer = await findCustomerByEmail(b.client_email);
        if (!zohoCustomer) {
          const newCustomer = await createCustomer(
            b.client_name,
            b.client_email,
            b.client_phone || '',
            b.location || ''
          );
          zohoCustomer = (newCustomer as any)?.contact;
        }

        const customerId = zohoCustomer?.contact_id;
        if (customerId) {
          // Create invoice in Zoho
          const invoice = await createInvoice(customerId, [{
            name: b.cleaning_type || 'Cleaning Service',
            description: `Booking #${b.id} - ${b.cleaning_type || 'Cleaning'}`,
            quantity: 1,
            rate: b.total_amount || event.amount! / 100,
          }]);

          const zohoInvoiceId = (invoice as any)?.invoice?.invoice_id;
          if (zohoInvoiceId) {
            // Record payment in Zoho
            await recordPayment(
              zohoInvoiceId,
              b.total_amount || event.amount! / 100,
              'card',
              new Date().toISOString().split('T')[0]
            );

            // Update booking with Zoho invoice ID
            await env.scratchsolid_db.prepare(`
              UPDATE bookings SET zoho_invoice_id = ? WHERE id = ?
            `).bind(zohoInvoiceId, bookingId).run();

            console.log('[paystack webhook] Zoho invoice created:', zohoInvoiceId);
          }
        }
      } catch (zohoError: any) {
        console.error('[paystack webhook] Zoho integration failed (non-fatal):', zohoError?.message || zohoError);
      }
    }

    return new Response(JSON.stringify({
      status: 'success',
      booking_id: bookingId,
      payment_id: (payment as any).id,
      message: 'Booking confirmed and payment processed'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('[paystack webhook] Error:', error?.message || error);
    return new Response(JSON.stringify({ error: 'Webhook processing failed', detail: error?.message || String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Paystack transaction verification (frontend can poll after redirect)
router.get('/api/payments/paystack/verify/:reference', async (request: any, env: any) => {
  try {
    const { reference } = request.params;

    // First check local database
    const db = getReadSession(env);
    const payment = await db.prepare('SELECT * FROM payments WHERE external_payment_id = ?')
      .bind(reference).first();

    if (payment && (payment as any).status === 'completed') {
      return new Response(JSON.stringify({
        status: 'success',
        reference,
        amount: (payment as any).amount,
        message: 'Payment verified'
      }), {
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }

    // Verify with Paystack API
    const verifyResult = await verifyTransaction(env, reference);

    if (verifyResult.status && verifyResult.data && verifyResult.data.status === 'success') {
      // If Paystack says success but local DB doesn't reflect it, update it
      if (payment) {
        await env.scratchsolid_db.prepare(`
          UPDATE payments SET status = 'completed', payment_date = datetime('now'), updated_at = datetime('now')
          WHERE id = ?
        `).bind((payment as any).id).run();

        // Also confirm the booking
        await env.scratchsolid_db.prepare(`
          UPDATE bookings SET status = 'confirmed', updated_at = datetime('now') WHERE id = ?
        `).bind((payment as any).booking_id).run();
      }

      return new Response(JSON.stringify({
        status: 'success',
        reference,
        amount: verifyResult.data.amount / 100,
        paid_at: verifyResult.data.paid_at,
        channel: verifyResult.data.channel,
        message: 'Payment verified'
      }), {
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }

    return new Response(JSON.stringify({
      status: verifyResult.data?.status || 'unknown',
      reference,
      message: verifyResult.message || 'Payment not completed'
    }), {
      status: 402,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error: any) {
    console.error('[paystack verify] error:', error?.message || error);
    return new Response(JSON.stringify({ error: 'Verification failed', detail: error?.message || String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Paystack refund endpoint (admin only)
router.post('/api/payments/paystack/refund', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
    return new Response(JSON.stringify({ error: 'Unauthorized — admin only' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }

  try {
    const { reference, amount, reason } = await request.json() as any;

    if (!reference) {
      return new Response(JSON.stringify({ error: 'reference is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }

    // Find the payment record
    const db = getReadSession(env);
    const payment = await db.prepare('SELECT * FROM payments WHERE external_payment_id = ?')
      .bind(reference).first();

    if (!payment) {
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }

    if ((payment as any).status === 'refunded') {
      return new Response(JSON.stringify({ error: 'Payment already refunded' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }

    // Call Paystack refund API
    const refundResult = await refundTransaction(env, {
      reference,
      amount: amount ? Math.round(amount * 100) : undefined, // convert ZAR to kobo
      reason: reason || 'Customer cancellation',
    });

    if (!refundResult.status) {
      return new Response(JSON.stringify({
        error: 'Paystack refund failed',
        detail: refundResult.message
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }

    // Update payment record
    const refundAmount = amount || (payment as any).amount;
    await env.scratchsolid_db.prepare(`
      UPDATE payments
      SET status = 'refunded',
          refunded_amount = ?,
          refund_reference = ?,
          refund_reason = ?,
          refunded_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      refundAmount,
      refundResult.data?.transaction?.reference || reference,
      reason || 'Customer cancellation',
      (payment as any).id
    ).run();

    // Also update booking status
    await env.scratchsolid_db.prepare(`
      UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?
    `).bind((payment as any).booking_id).run();

    return new Response(JSON.stringify({
      status: 'success',
      refund: refundResult.data,
      message: 'Refund processed successfully'
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error: any) {
    console.error('[paystack refund] error:', error?.message || error);
    return new Response(JSON.stringify({ error: 'Refund failed', detail: error?.message || String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Payment reconciliation endpoint (admin only)
router.get('/api/payments/reconciliation', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
    return new Response(JSON.stringify({ error: 'Unauthorized — admin only' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }

  try {
    const db = getReadSession(env);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];

    // Summary stats
    const summary = await db.prepare(`
      SELECT
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as total_collected,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN refunded_amount END), 0) as total_refunded,
        COALESCE(SUM(CASE WHEN status = 'completed' AND gateway = 'paystack' THEN amount END), 0) as paystack_collected
      FROM payments
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
    `).bind(startDate, endDate).first();

    // Per-payment detail
    const payments = await db.prepare(`
      SELECT
        p.id, p.booking_id, p.amount, p.status, p.gateway,
        p.external_payment_id, p.refunded_amount, p.refund_reason,
        p.created_at, p.payment_date, p.refunded_at,
        b.service_type, b.status as booking_status
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE date(p.created_at) >= date(?) AND date(p.created_at) <= date(?)
      ORDER BY p.created_at DESC
      LIMIT 200
    `).bind(startDate, endDate).all();

    // Discrepancies: payments marked completed but no booking confirmed
    const discrepancies = await db.prepare(`
      SELECT p.id, p.booking_id, p.amount, p.status as payment_status,
             b.status as booking_status
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.status = 'completed' AND b.status NOT IN ('confirmed', 'completed')
        AND date(p.created_at) >= date(?) AND date(p.created_at) <= date(?)
    `).bind(startDate, endDate).all();

    return new Response(JSON.stringify({
      period: { start_date: startDate, end_date: endDate },
      summary: summary || {},
      payments: payments.results || [],
      discrepancies: discrepancies.results || [],
      discrepancy_count: (discrepancies.results || []).length,
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error: any) {
    console.error('[reconciliation] error:', error?.message || error);
    return new Response(JSON.stringify({ error: 'Reconciliation failed', detail: error?.message || String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Weekend requests endpoints
router.post('/api/weekend-requests', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload || payload.role !== 'business') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { requested_date, special_instructions } = await request.json() as any;
    const businessId = payload.sub;
    
    const result = await env.scratchsolid_db.prepare(`
      INSERT INTO weekend_requests (business_id, requested_date, special_instructions, status, created_at)
      VALUES (?, ?, ?, 'pending', datetime('now'))
    `).bind(businessId, requested_date, special_instructions).run();
    
    return new Response(JSON.stringify({
      id: result.meta.last_row_id,
      business_id: businessId, requested_date, special_instructions,
      status: 'pending',
      message: 'Weekend request created successfully'
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to create weekend request: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.get('/api/weekend-requests', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload || payload.role !== 'business') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const db = getReadSession(env);
    const requests = await db.prepare(`
      SELECT * FROM weekend_requests 
      WHERE business_id = ? 
      ORDER BY created_at DESC
    `).bind(payload.sub).all();
    
    return new Response(JSON.stringify(requests.results || requests), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to fetch weekend requests: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.delete('/api/weekend-requests/:id', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload || payload.role !== 'business') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { id } = request.params;
    const db = getReadSession(env);
    const requestRecord = await db.prepare('SELECT business_id FROM weekend_requests WHERE id = ?').bind(id).first();
    if (!requestRecord || requestRecord.business_id !== payload.sub) {
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }
    
    const result = await env.scratchsolid_db.prepare('UPDATE weekend_requests SET status = ? WHERE id = ?').bind('cancelled', id).run();
    
    return new Response(JSON.stringify({ 
      message: 'Weekend request cancelled successfully'
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to cancel weekend request: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Forgot password endpoint
router.post('/api/auth/forgot-password', async (request: any, env: any) => {
  try {
    const { type, identifier } = await request.json() as any;
    
    if (!type || !identifier) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields: type and identifier are required" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }
    
    let user;
    
    if (type === "business") {
      // For businesses, find by email
      user = await findUserByEmail(env.scratchsolid_db, identifier);
      
      if (!user) {
        return new Response(JSON.stringify({ error: "No account found with this email address" }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
        });
      }
      
      // Generate reset token
      const resetToken = generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Store token in database
      await env.scratchsolid_db.prepare(`
        INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(user.id, resetToken, expiresAt.toISOString()).run();
      
      // Send reset email
      const resetLink = `https://scratchsolidsolutions.org/reset-password?token=${resetToken}`;
      await sendEmail(env, {
        to: identifier,
        subject: 'Password Reset - Scratch Solid Solutions',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset</h1>
              </div>
              <div class="content">
                <p>Hi ${user.name || 'there'},</p>
                <p>You requested to reset your password. Click the button below to reset it:</p>
                <p style="text-align: center; margin: 20px 0;">
                  <a href="${resetLink}" class="button">Reset Password</a>
                </p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't request this reset, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; 2024 Scratch Solid Solutions. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      });
      
      return new Response(JSON.stringify({
        message: "A password reset link has been sent to your email address."
      }), {
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
      
    } else {
      return new Response(JSON.stringify({ 
        error: "Invalid account type. Must be 'business'" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: "An unexpected error occurred. Please try again." 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Admin endpoints for weekend requests
router.put('/api/weekend-requests/:id/assign', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { id } = request.params;
    const { assigned_cleaner } = await request.json() as any;
    
    const result = await env.scratchsolid_db.prepare(`
      UPDATE weekend_requests 
      SET status = ?, assigned_cleaner = ?
      WHERE id = ?
    `).bind('assigned', assigned_cleaner, id).run();
    
    return new Response(JSON.stringify({ 
      message: 'Weekend request assigned successfully',
      id,
      status: 'assigned',
      assigned_cleaner
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to assign weekend request: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Reset password endpoint
router.post('/api/auth/reset-password', async (request: any, env: any) => {
  try {
    const { token } = await request.json() as any;
    
    if (!token) {
      return new Response(JSON.stringify({ 
        error: "Reset token is required" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }
    
    // Find valid token
    const db = getReadSession(env);
    const resetToken = await db.prepare(`
      SELECT * FROM password_reset_tokens 
      WHERE token = ? AND expires_at > datetime('now') 
      ORDER BY created_at DESC 
      LIMIT 1
    `).bind(token).first();
    
    if (!resetToken) {
      return new Response(JSON.stringify({ 
        error: "Invalid or expired reset token" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }
    
    // Get user (reuse the same db session)
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(resetToken.user_id).first();
    
    if (!user) {
      return new Response(JSON.stringify({ 
        error: "User not found" 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }
    
    // Generate new password
    const newPassword = generateRandomPassword();
    const passwordHash = await hashPassword(newPassword);
    
    // Update user password
    await env.scratchsolid_db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, user.id).run();
    
    // Delete used token
    await env.scratchsolid_db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').bind(resetToken.id).run();
    
    // Send confirmation email
    await sendEmail(env, {
      to: user.email,
      subject: 'Password Reset Successful - Scratch Solid Solutions',
      html: `
        <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Successful</h1>
              </div>
              <div class="content">
                <p>Hi ${user.name || 'there'},</p>
                <p>Your password has been successfully reset. Your new password is:</p>
                <p style="background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace;">${newPassword}</p>
                <p>Please save this password securely and consider changing it after your first login.</p>
              </div>
              <div class="footer">
                <p>&copy; 2024 Scratch Solid Solutions. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `
    });
    
    return new Response(JSON.stringify({
      message: "Password has been reset successfully"
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: "An unexpected error occurred. Please try again." 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Helper functions
function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateRandomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Business events endpoints
router.post('/api/business-events', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload || payload.role !== 'business') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { event_type, requested_date, special_instructions } = await request.json() as any;
    const businessId = payload.sub;
    
    const result = await env.scratchsolid_db.prepare(`
      INSERT INTO business_events (business_id, event_type, requested_date, special_instructions, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(businessId, event_type, requested_date, special_instructions).run();
    
    return new Response(JSON.stringify({ 
      id: result.meta.last_row_id,
      business_id: businessId,
      event_type,
      requested_date,
      special_instructions,
      message: 'Business event created successfully'
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to create business event: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.get('/api/business-events', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload || payload.role !== 'business') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const db = getReadSession(env);
    const events = await db.prepare(`
      SELECT * FROM business_events 
      WHERE business_id = ? 
      ORDER BY created_at DESC
    `).bind(payload.sub).all();
    
    return new Response(JSON.stringify(events.results || events), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to fetch business events: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Pricing endpoints
router.get('/api/pricing', async (request, env) => {
  try {
    const db = getReadSession(env);
    const pricing = await db.prepare('SELECT * FROM pricing ORDER BY created_at DESC').all();
    
    return new Response(JSON.stringify(pricing.results || pricing), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to fetch pricing: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.post('/api/pricing', async (request: any, env: any) => {
  const payload: any = await verifyToken(request, env);
  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { service_type, rate, duration } = await request.json() as any;
    
    const result = await env.scratchsolid_db.prepare(`
      INSERT INTO pricing (service_type, rate, duration, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).bind(service_type, rate, duration).run();
    
    return new Response(JSON.stringify({ 
      id: result.meta.last_row_id,
      service_type, rate, duration,
      message: 'Pricing updated successfully'
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to update pricing: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// 404 handler
router.all('*', (request) => {
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
  });
});

export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  },
  async scheduled(event, env, ctx) {
    // Set global instances for shared modules
    setDbInstance(env.scratchsolid_db);
    setEnvInstance(env);

    // 1. Data retention cleanup task (main backend DB)
    const cleanup = new DataRetentionCleanup(env);
    await cleanup.runAllCleanup();

    // 2. Portal DB cleanup (POPIA compliance for internal-portal tables)
    if (env.portal_db) {
      try {
        const portalResult = await cleanupPortalExpiredData(env.portal_db);
        console.log('Portal cleanup completed:', portalResult.deleted);
        if (portalResult.errors.length > 0) {
          console.error('Portal cleanup errors:', portalResult.errors);
        }
      } catch (error) {
        console.error('Portal cleanup failed:', error);
      }
    }

    // 3. Training DB cleanup
    if (env.training_db) {
      try {
        const trainingResult = await cleanupTrainingExpiredData(env.training_db);
        console.log('Training cleanup completed:', trainingResult.deleted);
        if (trainingResult.errors.length > 0) {
          console.error('Training cleanup errors:', trainingResult.errors);
        }
      } catch (error) {
        console.error('Training cleanup failed:', error);
      }
    }

    // 4. Hard delete accounts (30-day grace period)
    await handleHardDeleteAccounts();

    // 5. Overdue cancellations and credits
    await handleOverdueCancellations();

    // 6. Detailed retention policies
    await handleRetentionPolicies();

    console.log('All scheduled tasks completed');
  },
  async queue(batch, env, ctx) {
    return queueHandler.queue(batch, env, ctx);
  }
};
