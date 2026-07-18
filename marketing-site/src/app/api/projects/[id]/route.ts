export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { withAuth, withAdminOrServiceAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { getProjectDetail, getProjectById, updateProject } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);

  // Admin sessions and the internal-portal service token can view any project;
  // a normal client/business session may only view their own.
  const adminOrService = await withAdminOrServiceAuth(request);
  const authResult = adminOrService instanceof NextResponse ? await withAuth(request) : adminOrService;
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;
  const isPrivileged = !(adminOrService instanceof NextResponse);

  try {
    const { id } = await params;
    const project = await getProjectDetail(db, Number(id));
    if (!project) {
      return withSecurityHeaders(NextResponse.json({ error: 'Project not found' }, { status: 404 }), traceId);
    }

    const sessionId: number = (user as any).user_id;
    if (!isPrivileged && (project as any).client_id !== sessionId) {
      return withSecurityHeaders(NextResponse.json({ error: 'Not found' }, { status: 404 }), traceId);
    }

    const response = NextResponse.json(project);
    response.headers.set('Cache-Control', 'private, max-age=15');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching project', error as Error);
    const response = NextResponse.json({ error: `Failed to fetch project: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAdminOrServiceAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { id } = await params;
    const existing = await getProjectById(db, Number(id));
    if (!existing) {
      return withSecurityHeaders(NextResponse.json({ error: 'Project not found' }, { status: 404 }), traceId);
    }

    const body = await request.json() as Record<string, any>;
    const allowed = ['name', 'description', 'status', 'start_date', 'end_date'];
    const data: Record<string, any> = {};
    for (const key of allowed) if (key in body) data[key] = body[key];

    if (Object.keys(data).length === 0) {
      return withSecurityHeaders(NextResponse.json({ error: 'No valid fields to update' }, { status: 400 }), traceId);
    }

    const project = await updateProject(db, Number(id), data);
    const response = NextResponse.json(project);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error updating project', error as Error);
    const response = NextResponse.json({ error: `Project update failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
