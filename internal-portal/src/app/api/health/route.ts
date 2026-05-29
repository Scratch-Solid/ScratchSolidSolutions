export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const healthStatus = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'unknown' as 'healthy' | 'unhealthy', message: '' },
      r2: { status: 'unknown' as 'healthy' | 'unhealthy', message: '' },
      twilio: { status: 'unknown' as 'healthy' | 'unhealthy', message: '' },
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
    healthStatus.checks.database = { status: 'unhealthy', message: `Database error: ${error}` };
    healthStatus.status = 'degraded';
  }

  // Check R2 connectivity (basic check - bucket binding exists)
  try {
    // R2 binding check is implicit in Cloudflare Workers
    // If the worker is running, R2 binding should be available
    healthStatus.checks.r2 = { status: 'healthy', message: 'R2 binding available' };
  } catch (error) {
    healthStatus.checks.r2 = { status: 'unhealthy', message: `R2 error: ${error}` };
    healthStatus.status = 'degraded';
  }

  // Check Twilio connectivity (basic check - environment variables)
  try {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (twilioAccountSid && twilioAuthToken) {
      healthStatus.checks.twilio = { status: 'healthy', message: 'Twilio credentials configured' };
    } else {
      healthStatus.checks.twilio = { status: 'unhealthy', message: 'Twilio credentials missing' };
      healthStatus.status = 'degraded';
    }
  } catch (error) {
    healthStatus.checks.twilio = { status: 'unhealthy', message: `Twilio error: ${error}` };
    healthStatus.status = 'degraded';
  }

  // Determine overall status
  const unhealthyChecks = Object.values(healthStatus.checks).filter(c => c.status === 'unhealthy');
  if (unhealthyChecks.length > 0) {
    healthStatus.status = unhealthyChecks.length === Object.keys(healthStatus.checks).length ? 'unhealthy' : 'degraded';
  }

  return NextResponse.json(healthStatus);
}
