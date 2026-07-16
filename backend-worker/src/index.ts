/**
 * Cloudflare Workers backend.
 *
 * This worker's own D1 database (scratchsolid_db) has no real bookings or
 * users in it in either environment - all real traffic is served by
 * marketing-site and internal-portal against their own databases. The
 * routes that used to live here (auth, bookings, contracts, payments,
 * pricing, etc.) were an orphaned parallel implementation with zero live
 * callers, confirmed removed 2026-07-16. This worker now only serves the
 * ops health check and the scheduled/queue data-retention jobs below.
 */

import { Router } from 'itty-router';
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

const router = Router();

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
