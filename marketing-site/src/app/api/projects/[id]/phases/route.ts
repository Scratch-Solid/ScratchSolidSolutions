export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { validateString } from "@/lib/validation";
import { withAdminOrServiceAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { addProjectPhase, updateProjectPhase } from '@/lib/db';

// POST /api/projects/[id]/phases — add a phase (admin / internal-portal only)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAdminOrServiceAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { id } = await params;
    const body = await request.json() as { name?: string; status?: string; order_index?: number };
    const nameValidation = validateString(body.name, 'name');
    if (!nameValidation.valid) {
      return withSecurityHeaders(NextResponse.json({ error: nameValidation.errors.join(', ') }, { status: 400 }), traceId);
    }

    const phase = await addProjectPhase(db, {
      project_id: Number(id),
      name: body.name!,
      status: body.status,
      order_index: body.order_index,
    });
    return withSecurityHeaders(NextResponse.json(phase, { status: 201 }), traceId);
  } catch (error) {
    logger.error('Error adding project phase', error as Error);
    const response = NextResponse.json({ error: `Failed to add phase: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

// PUT /api/projects/[id]/phases — update an existing phase (body must include `id`)
export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAdminOrServiceAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json() as Record<string, any>;
    const { id, ...rest } = body;
    if (!id) {
      return withSecurityHeaders(NextResponse.json({ error: 'phase id is required' }, { status: 400 }), traceId);
    }
    const allowed = ['name', 'status', 'order_index'];
    const data: Record<string, any> = {};
    for (const key of allowed) if (key in rest) data[key] = rest[key];
    if (Object.keys(data).length === 0) {
      return withSecurityHeaders(NextResponse.json({ error: 'No valid fields to update' }, { status: 400 }), traceId);
    }

    const phase = await updateProjectPhase(db, Number(id), data);
    return withSecurityHeaders(NextResponse.json(phase), traceId);
  } catch (error) {
    logger.error('Error updating project phase', error as Error);
    const response = NextResponse.json({ error: `Failed to update phase: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
