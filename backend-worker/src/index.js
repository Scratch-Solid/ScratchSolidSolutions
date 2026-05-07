/**
 * Cloudflare Workers FastAPI Backend
 * Full backend implementation using D1 database
 */

import { Router } from 'itty-router';
import { sha256 } from '@noble/hashes/sha256';
import jwt from '@tsndr/cloudflare-worker-jwt';

const router = Router();

// Email helper function using Resend API
async function sendEmail(env, { to, subject, html, replyTo }) {
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
const ALLOWED_ORIGINS = [
  'https://scratchsolidsolutions.org',
  'https://portal.scratchsolidsolutions.org',
  'https://www.scratchsolidsolutions.org',
  'https://scratchsolid.com',
  'https://portal.scratchsolid.com',
  'https://www.scratchsolid.com',
  'http://localhost:3000',
  'http://localhost:3001'
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

// JWT utilities
function createToken(userId, role) {
  return jwt.sign(
    { sub: String(userId), role },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

async function verifyToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    const payload = await jwt.verify(token, env.JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

// User authentication using Web Crypto PBKDF2 (bcryptjs not available in Workers)
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(saltHex), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:100000:${saltHex}:${hashHex}`;
}

async function verifyPassword(password, storedHash) {
  // Support legacy SHA256 hashes for migration
  if (!storedHash.startsWith('pbkdf2:')) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt');
    const hashBuffer = await sha256(data);
    const legacyHash = Array.from(hashBuffer).map(b => b.toString(16).padStart(2, '0')).join('');
    return legacyHash === storedHash;
  }
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

// Database helpers
async function createUser(db, userData) {
  const hashedPassword = await hashPassword(userData.password);
  const result = await db.prepare(`
    INSERT INTO users (role, name, email, password_hash, phone, address, business_name, business_info, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    userData.role,
    userData.name,
    userData.email,
    hashedPassword,
    userData.phone,
    userData.address,
    userData.business_name,
    userData.business_info
  ).run();
  
  return result.meta.last_row_id;
}

async function findUserByEmail(db, email) {
  return await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
}

// Routes
router.options('*', (request) => new Response(null, { headers: getCorsHeaders(request) }));

// Health check (no auth required)
router.get('/health', (request) => {
  return new Response(JSON.stringify({ status: 'ok', service: 'cloudflare-worker' }), {
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
  });
});

// Auth endpoints
router.post('/auth/signup', async (request, env) => {
  try {
    const { name, email, password, role, phone, address, business_name, business_info } = await request.json();
    
    // Check if user exists
    const existingUser = await findUserByEmail(env.DB, email);
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }
    
    // Create user
    const userId = await createUser(env.DB, {
      name, email, password, role, phone, address, business_name, business_info
    });
    
    const token = createToken(userId, role);
    
    return new Response(JSON.stringify({ 
      access_token: token, 
      token_type: 'bearer',
      user: { id: userId, name, email, role }
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Signup failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.post('/auth/login', async (request, env) => {
  try {
    const { email, password } = await request.json();
    
    const user = await findUserByEmail(env.DB, email);
    if (!user || !await verifyPassword(password, user.password_hash)) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }
    
    const token = createToken(user.id, user.role);
    
    return new Response(JSON.stringify({ 
      access_token: token, 
      token_type: 'bearer',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Login failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Get current user
router.get('/auth/me', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  const user = await env.DB.prepare('SELECT id, name, email, role FROM users WHERE id = ?')
    .bind(parseInt(payload.sub)).first();
    
  return new Response(JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
  });
});

// Bookings endpoints
router.post('/bookings', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { user_id, booking_type, cleaning_type, payment_method, start_time, end_time, special_instructions } = await request.json();
    
    const result = await env.DB.prepare(`
      INSERT INTO bookings (user_id, booking_type, cleaning_type, payment_method, start_time, end_time, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).bind(user_id, booking_type, cleaning_type, payment_method, start_time, end_time).run();
    
    return new Response(JSON.stringify({ 
      id: result.meta.last_row_id,
      message: 'Booking created successfully'
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Booking creation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.get('/bookings', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id') || payload.sub;
  
  const bookings = await env.DB.prepare(`
    SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC
  `).bind(userId).all();
    
  return new Response(JSON.stringify(bookings.results || bookings), {
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
  });
});

router.delete('/bookings/:id', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  const { id } = request.params;
  
  // Verify booking belongs to user
  const booking = await env.DB.prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?')
    .bind(id, payload.sub).first();
    
  if (!booking) {
    return new Response(JSON.stringify({ error: 'Booking not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  await env.DB.prepare('UPDATE bookings SET status = ? WHERE id = ?')
    .bind('cancelled', id).run();
    
  return new Response(JSON.stringify({ message: 'Booking cancelled' }), {
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
  });
});

// Templates endpoints
router.post('/templates', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { name, content } = await request.json();
    
    const result = await env.DB.prepare(`
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
    return new Response(JSON.stringify({ error: 'Template creation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.get('/templates', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  const templates = await env.DB.prepare('SELECT * FROM templates ORDER BY created_at DESC').all();
  
  return new Response(JSON.stringify(templates.results || templates), {
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
  });
});

// Contracts endpoints
router.post('/contracts', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'business') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { business_id, duration, template_id } = await request.json();
    
    // Get template content for contract
    const template = await env.DB.prepare('SELECT content FROM templates WHERE id = ?').bind(template_id).first();
    
    const result = await env.DB.prepare(`
      INSERT INTO contracts (business_id, duration, rate, template_id, immutable, created_at)
      VALUES (?, ?, 0, ?, TRUE, datetime('now'))
    `).bind(business_id, duration, template_id).run();
    
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
    return new Response(JSON.stringify({ error: 'Contract creation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.get('/contracts/:id', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'business') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { id } = request.params;
    const contract = await env.DB.prepare(`
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
    return new Response(JSON.stringify({ error: 'Failed to fetch contract' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.put('/contracts/:id/rate', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { id } = request.params;
    const { rate } = await request.json();
    
    const result = await env.DB.prepare('UPDATE contracts SET rate = ? WHERE id = ?').bind(rate, id).run();
    
    return new Response(JSON.stringify({ 
      message: 'Contract rate updated successfully',
      id,
      rate
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update contract rate' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.get('/contracts/:id/export', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'business') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { id } = request.params;
    const contract = await env.DB.prepare(`
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
    return new Response(JSON.stringify({ error: 'Failed to export contract' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Payments endpoints
router.post('/payments', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { booking_id, method, amount } = await request.json();
    
    const result = await env.DB.prepare(`
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
    return new Response(JSON.stringify({ error: 'Payment recording failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.put('/payments/:id/confirm', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { id } = request.params;
    
    const result = await env.DB.prepare('UPDATE payments SET confirmed = TRUE WHERE id = ?').bind(id).run();
    
    return new Response(JSON.stringify({ 
      message: 'Payment confirmed successfully',
      id,
      confirmed: true
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to confirm payment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Weekend requests endpoints
router.post('/weekend-requests', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'business') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { business_id, requested_date, special_instructions } = await request.json();
    
    const result = await env.DB.prepare(`
      INSERT INTO weekend_requests (business_id, requested_date, special_instructions, status, created_at)
      VALUES (?, ?, ?, 'pending', datetime('now'))
    `).bind(business_id, requested_date, special_instructions).run();
    
    return new Response(JSON.stringify({ 
      id: result.meta.last_row_id,
      business_id, requested_date, special_instructions,
      status: 'pending',
      message: 'Weekend request created successfully'
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create weekend request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.get('/weekend-requests', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'business') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const requests = await env.DB.prepare(`
      SELECT * FROM weekend_requests 
      WHERE business_id = ? 
      ORDER BY created_at DESC
    `).bind(payload.sub).all();
    
    return new Response(JSON.stringify(requests.results || requests), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch weekend requests' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.delete('/weekend-requests/:id', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'business') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { id } = request.params;
    
    const result = await env.DB.prepare('UPDATE weekend_requests SET status = ? WHERE id = ?').bind('cancelled', id).run();
    
    return new Response(JSON.stringify({ 
      message: 'Weekend request cancelled successfully'
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to cancel weekend request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Forgot password endpoint
router.post('/auth/forgot-password', async (request, env) => {
  try {
    const { type, identifier } = await request.json();
    
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
      user = await findUserByEmail(env.DB, identifier);
      
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
      await env.DB.prepare(`
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
router.put('/weekend-requests/:id/assign', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { id } = request.params;
    const { assigned_cleaner } = await request.json();
    
    const result = await env.DB.prepare(`
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
    return new Response(JSON.stringify({ error: 'Failed to assign weekend request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Reset password endpoint
router.post('/auth/reset-password', async (request, env) => {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return new Response(JSON.stringify({ 
        error: "Reset token is required" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
      });
    }
    
    // Find valid token
    const resetToken = await env.DB.prepare(`
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
    
    // Get user
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(resetToken.user_id).first();
    
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
    await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, user.id).run();
    
    // Delete used token
    await env.DB.prepare('DELETE FROM password_reset_tokens WHERE id = ?').bind(resetToken.id).run();
    
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

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Business events endpoints
router.post('/business-events', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'business') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { business_id, event_type, requested_date, special_instructions } = await request.json();
    
    const result = await env.DB.prepare(`
      INSERT INTO business_events (business_id, event_type, requested_date, special_instructions, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(business_id, event_type, requested_date, special_instructions).run();
    
    return new Response(JSON.stringify({ 
      id: result.meta.last_row_id,
      business_id, event_type, requested_date, special_instructions,
      message: 'Business event created successfully'
    }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create business event' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.get('/business-events', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'business') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const events = await env.DB.prepare(`
      SELECT * FROM business_events 
      WHERE business_id = ? 
      ORDER BY created_at DESC
    `).bind(payload.sub).all();
    
    return new Response(JSON.stringify(events.results || events), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch business events' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

// Pricing endpoints
router.get('/pricing', async (request, env) => {
  try {
    const pricing = await env.DB.prepare('SELECT * FROM pricing ORDER BY created_at DESC').all();
    
    return new Response(JSON.stringify(pricing.results || pricing), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch pricing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
});

router.post('/pricing', async (request, env) => {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) }
    });
  }
  
  try {
    const { service_type, rate, duration } = await request.json();
    
    const result = await env.DB.prepare(`
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
    return new Response(JSON.stringify({ error: 'Failed to update pricing' }), {
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
};
