/**
 * Cloudflare Workers FastAPI Backend
 * Full backend implementation using D1 database
 */

import { Router } from 'itty-router';
import { sha256 } from '@noble/hashes/sha256';
import jwt from '@tsndr/cloudflare-worker-jwt';

const router = Router();

// CORS middleware - restrict to known origins only
const ALLOWED_ORIGINS = [
  'https://scratchsolid.com',
  'https://portal.scratchsolid.com',
  'https://www.scratchsolid.com',
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
