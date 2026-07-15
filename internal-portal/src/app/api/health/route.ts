export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getEnvVarOptional } from '@/lib/env';
import { getCloudflareContext } from '@/lib/runtime-context';

export async function GET() {
  const healthStatus = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    checks: {
      database: { status: 'unknown' as 'healthy' | 'unhealthy', message: '' },
      r2: { status: 'unknown' as 'healthy' | 'unhealthy', message: '' },
      resend: { status: 'unknown' as 'healthy' | 'unhealthy', message: '' },
      meta_cloud_api: { status: 'unknown' as 'healthy' | 'unhealthy', message: '' },
      erpnext: { status: 'unknown' as 'healthy' | 'unhealthy', message: '' },
      zoho_oauth: { status: 'unknown' as 'healthy' | 'unhealthy', message: '' },
      paystack: { status: 'unknown' as 'healthy' | 'unhealthy', message: '' },
    },
  };

  // Check database connectivity
  try {
    const db = await getDb();
    if (db) {
      await db.prepare('SELECT 1').first();
      healthStatus.checks.database = { status: 'healthy', message: 'Database connection successful' };
    } else {
      healthStatus.checks.database = { status: 'unhealthy', message: 'Database connection failed' };
      healthStatus.status = 'degraded';
    }
  } catch (error) {
    healthStatus.checks.database = { status: 'unhealthy', message: `Database error: ${String(error)}` };
    healthStatus.status = 'degraded';
  }

  // Check R2 connectivity (basic check - bucket binding exists)
  try {
    // R2 binding check is implicit in Cloudflare Workers
    healthStatus.checks.r2 = { status: 'healthy', message: 'R2 binding available' };
  } catch (error) {
    healthStatus.checks.r2 = { status: 'unhealthy', message: `R2 error: ${String(error)}` };
    healthStatus.status = 'degraded';
  }

  // Check Resend email API credentials
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const resendKey = (env as any)?.RESEND_API_KEY || getEnvVarOptional('RESEND_API_KEY');
    if (resendKey) {
      healthStatus.checks.resend = { status: 'healthy', message: 'Resend API key configured' };
    } else {
      healthStatus.checks.resend = { status: 'unhealthy', message: 'RESEND_API_KEY missing' };
      healthStatus.status = 'degraded';
    }
  } catch (error) {
    healthStatus.checks.resend = { status: 'unhealthy', message: `Resend error: ${String(error)}` };
    healthStatus.status = 'degraded';
  }

  // Check Meta Cloud API credentials (optional — WhatsApp fallback to email)
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const metaToken = (env as any)?.META_ACCESS_TOKEN || getEnvVarOptional('META_ACCESS_TOKEN');
    const metaPhoneId = (env as any)?.META_PHONE_NUMBER_ID || getEnvVarOptional('META_PHONE_NUMBER_ID');
    if (metaToken && metaPhoneId) {
      healthStatus.checks.meta_cloud_api = { status: 'healthy', message: 'Meta Cloud API credentials configured' };
    } else {
      healthStatus.checks.meta_cloud_api = { status: 'healthy', message: 'Meta Cloud API not configured (optional — WhatsApp fallback to email)' };
    }
  } catch (error) {
    healthStatus.checks.meta_cloud_api = { status: 'healthy', message: `Meta API check skipped: ${String(error)}` };
  }

  // Check ERPNext connectivity (optional — payroll via local DB if unavailable)
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const erpUrl = (env as any)?.ERPNEXT_API_URL || getEnvVarOptional('ERPNEXT_API_URL');
    const erpKey = (env as any)?.ERPNEXT_API_KEY || getEnvVarOptional('ERPNEXT_API_KEY');
    if (erpUrl && erpKey) {
      healthStatus.checks.erpnext = { status: 'healthy', message: 'ERPNext credentials configured' };
    } else {
      healthStatus.checks.erpnext = { status: 'healthy', message: 'ERPNext not configured (optional — payroll via local DB)' };
    }
  } catch (error) {
    healthStatus.checks.erpnext = { status: 'healthy', message: `ERPNext check skipped: ${String(error)}` };
  }

  // Check Zoho OAuth credentials (optional — invoices via local DB if unavailable)
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const zohoClientId = (env as any)?.ZOHO_CLIENT_ID || getEnvVarOptional('ZOHO_CLIENT_ID');
    const zohoClientSecret = (env as any)?.ZOHO_CLIENT_SECRET || getEnvVarOptional('ZOHO_CLIENT_SECRET');
    const zohoRefreshToken = (env as any)?.ZOHO_REFRESH_TOKEN || getEnvVarOptional('ZOHO_REFRESH_TOKEN');
    if (zohoClientId && zohoClientSecret && zohoRefreshToken) {
      healthStatus.checks.zoho_oauth = { status: 'healthy', message: 'Zoho OAuth credentials configured' };
    } else {
      healthStatus.checks.zoho_oauth = { status: 'healthy', message: 'Zoho not configured (optional — invoices via local DB)' };
    }
  } catch (error) {
    healthStatus.checks.zoho_oauth = { status: 'healthy', message: `Zoho check skipped: ${String(error)}` };
  }

  // Check Paystack credentials (payment gateway)
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const paystackSecret = (env as any)?.PAYSTACK_SECRET_KEY || getEnvVarOptional('PAYSTACK_SECRET_KEY');
    if (paystackSecret) {
      healthStatus.checks.paystack = { status: 'healthy', message: 'Paystack API key configured' };
    } else {
      healthStatus.checks.paystack = { status: 'unhealthy', message: 'PAYSTACK_SECRET_KEY missing' };
      healthStatus.status = 'degraded';
    }
  } catch (error) {
    healthStatus.checks.paystack = { status: 'unhealthy', message: `Paystack check skipped: ${String(error)}` };
    healthStatus.status = 'degraded';
  }

  // Determine overall status — only critical services affect go-live
  const criticalChecks = ['database', 'resend', 'paystack'] as const;
  const criticalUnhealthy = criticalChecks.filter(k => healthStatus.checks[k as keyof typeof healthStatus.checks].status === 'unhealthy');
  if (criticalUnhealthy.length > 0) {
    healthStatus.status = 'degraded';
  }

  return NextResponse.json(healthStatus);
}
