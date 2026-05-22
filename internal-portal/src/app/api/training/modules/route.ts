export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getTrainingDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  const trainingDb = await getTrainingDb();
  if (!trainingDb) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Training database not available' }, { status: 500 }),
      traceId
    );
  }

  try {
    // Get all training modules
    const modules = await trainingDb.prepare(
      'SELECT * FROM training_modules_manifest ORDER BY module_id'
    ).all();

    return withSecurityHeaders(
      NextResponse.json(modules.results || []),
      traceId
    );

  } catch (error) {
    console.error('Error fetching training modules:', error);
    return withSecurityHeaders(
      NextResponse.json({ error: 'Failed to fetch training modules' }, { status: 500 }),
      traceId
    );
  }
}
