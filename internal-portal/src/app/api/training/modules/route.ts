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
    // Two different consumers read this response with two different field
    // naming conventions: the cleaner dashboard uses the raw manifest column
    // names (module_id, module_title, estimated_duration_minutes), while the
    // admin training page expects generic names (id, title, duration_minutes)
    // and crashed on `m.title.toLowerCase()` since `title` was always
    // undefined. Returning both keeps both consumers working.
    const modules = await trainingDb.prepare(
      `SELECT module_id, module_title, estimated_duration_minutes, required_passing_score,
              module_id AS id, module_title AS title,
              estimated_duration_minutes AS duration_minutes,
              NULL AS description, NULL AS category
       FROM training_modules_manifest ORDER BY module_id`
    ).all();

    return withSecurityHeaders(
      NextResponse.json(modules.results || []),
      traceId
    );

  } catch (error) {
    console.error('Error fetching training modules:', error);
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to fetch training modules: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
