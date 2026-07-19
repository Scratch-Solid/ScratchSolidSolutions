export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { validateString } from "@/lib/validation";
import { withAdminOrServiceAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { addProjectMilestone, updateProjectMilestone } from '@/lib/db';

// POST /api/projects/[id]/milestones — add a milestone (admin / internal-portal only)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAdminOrServiceAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { id } = await params;
    const body = await request.json() as {
      phase_id?: number; name?: string; status?: string; billing_status?: string; amount?: number; due_date?: string;
    };
    const nameValidation = validateString(body.name, 'name');
    if (!nameValidation.valid) {
      return withSecurityHeaders(NextResponse.json({ error: nameValidation.errors.join(', ') }, { status: 400 }), traceId);
    }

    const milestone = await addProjectMilestone(db, {
      project_id: Number(id),
      phase_id: body.phase_id,
      name: body.name!,
      status: body.status,
      billing_status: body.billing_status,
      amount: body.amount,
      due_date: body.due_date,
    });
    return withSecurityHeaders(NextResponse.json(milestone, { status: 201 }), traceId);
  } catch (error) {
    logger.error('Error adding project milestone', error as Error);
    const response = NextResponse.json({ error: `Failed to add milestone: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

// PUT /api/projects/[id]/milestones — update a milestone, e.g. billing_status (body must include `id`)
export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAdminOrServiceAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json() as Record<string, any>;
    const { id, ...rest } = body;
    if (!id) {
      return withSecurityHeaders(NextResponse.json({ error: 'milestone id is required' }, { status: 400 }), traceId);
    }
    const allowed = ['name', 'status', 'billing_status', 'amount', 'due_date', 'phase_id'];
    const data: Record<string, any> = {};
    for (const key of allowed) if (key in rest) data[key] = rest[key];
    if (Object.keys(data).length === 0) {
      return withSecurityHeaders(NextResponse.json({ error: 'No valid fields to update' }, { status: 400 }), traceId);
    }

    const milestone = await updateProjectMilestone(db, Number(id), data);
    return withSecurityHeaders(NextResponse.json(milestone), traceId);
  } catch (error) {
    logger.error('Error updating project milestone', error as Error);
    const response = NextResponse.json({ error: `Failed to update milestone: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
