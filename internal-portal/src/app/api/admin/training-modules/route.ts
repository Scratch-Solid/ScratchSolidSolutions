export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getTrainingDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

// Admin CRUD for training_modules_manifest - the catalog behind
// GET /api/training/modules (admin Training page + cleaner dashboard module
// list). Note: this is a separate catalog from the CLEANER_TRAINING_MODULES
// array in lib/cleaner-training.ts used during onboarding completion
// tracking - that one remains source-code-defined for now.
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  const trainingDb = await getTrainingDb();
  if (!trainingDb) return withSecurityHeaders(NextResponse.json({ error: 'Training database unavailable' }, { status: 503 }), traceId);

  try {
    const result = await trainingDb.prepare(
      'SELECT module_id, module_title, estimated_duration_minutes, required_passing_score FROM training_modules_manifest ORDER BY module_id'
    ).all();
    return withSecurityHeaders(NextResponse.json(result.results || []), traceId);
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to fetch training modules: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  const trainingDb = await getTrainingDb();
  if (!trainingDb) return withSecurityHeaders(NextResponse.json({ error: 'Training database unavailable' }, { status: 503 }), traceId);

  try {
    const body = await request.json() as { module_title?: string; estimated_duration_minutes?: number; required_passing_score?: number };
    const { module_title, estimated_duration_minutes, required_passing_score } = body;

    if (!module_title || !module_title.trim()) {
      return withSecurityHeaders(NextResponse.json({ error: 'Module title is required' }, { status: 400 }), traceId);
    }

    const result = await trainingDb.prepare(
      `INSERT INTO training_modules_manifest (module_title, estimated_duration_minutes, required_passing_score)
       VALUES (?, ?, ?)`
    ).bind(
      module_title.trim(),
      estimated_duration_minutes || 15,
      required_passing_score ?? 100.0
    ).run();

    return withSecurityHeaders(NextResponse.json({ module_id: result.meta.last_row_id, success: true }, { status: 201 }), traceId);
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to create training module: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}

export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  const trainingDb = await getTrainingDb();
  if (!trainingDb) return withSecurityHeaders(NextResponse.json({ error: 'Training database unavailable' }, { status: 503 }), traceId);

  try {
    const body = await request.json() as { module_id?: number; module_title?: string; estimated_duration_minutes?: number; required_passing_score?: number };
    const { module_id, module_title, estimated_duration_minutes, required_passing_score } = body;

    if (!module_id) {
      return withSecurityHeaders(NextResponse.json({ error: 'module_id is required' }, { status: 400 }), traceId);
    }

    const result = await trainingDb.prepare(
      `UPDATE training_modules_manifest
       SET module_title = COALESCE(?, module_title),
           estimated_duration_minutes = COALESCE(?, estimated_duration_minutes),
           required_passing_score = COALESCE(?, required_passing_score)
       WHERE module_id = ?`
    ).bind(module_title || null, estimated_duration_minutes ?? null, required_passing_score ?? null, module_id).run();

    if (result.meta.changes === 0) {
      return withSecurityHeaders(NextResponse.json({ error: 'Training module not found' }, { status: 404 }), traceId);
    }

    return withSecurityHeaders(NextResponse.json({ success: true }), traceId);
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to update training module: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}

export async function DELETE(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  const trainingDb = await getTrainingDb();
  if (!trainingDb) return withSecurityHeaders(NextResponse.json({ error: 'Training database unavailable' }, { status: 503 }), traceId);

  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('module_id');
    if (!moduleId) {
      return withSecurityHeaders(NextResponse.json({ error: 'module_id is required' }, { status: 400 }), traceId);
    }

    const result = await trainingDb.prepare(
      'DELETE FROM training_modules_manifest WHERE module_id = ?'
    ).bind(parseInt(moduleId)).run();

    if (result.meta.changes === 0) {
      return withSecurityHeaders(NextResponse.json({ error: 'Training module not found' }, { status: 404 }), traceId);
    }

    return withSecurityHeaders(NextResponse.json({ success: true }), traceId);
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to delete training module: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
