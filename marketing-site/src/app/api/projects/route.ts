export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { validateString } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { withAuth, withAdminOrServiceAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { createProject, getProjectsByClient, getAllProjects, getUserByEmail } from '@/lib/db';

// GET /api/projects — admin sessions and the internal-portal service token get
// every project (optionally filtered by ?client_id=), for the staff admin
// screen; a normal client/business session only ever gets their own, so the
// client dashboard can safely call this to decide whether to show Digital.
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);

  const adminOrService = await withAdminOrServiceAuth(request);
  if (!(adminOrService instanceof NextResponse)) {
    try {
      const { db } = adminOrService;
      const { searchParams } = new URL(request.url);
      const queryClientId = searchParams.get('client_id');
      const projects = queryClientId ? await getProjectsByClient(db, Number(queryClientId)) : await getAllProjects(db);
      const response = NextResponse.json(projects);
      response.headers.set('Cache-Control', 'private, max-age=30');
      return withSecurityHeaders(response, traceId);
    } catch (error) {
      logger.error('Error fetching projects (admin/service)', error as Error);
      const response = NextResponse.json({ error: `Failed to fetch projects: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
      return withSecurityHeaders(response, traceId);
    }
  }

  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const sessionId: number = (user as any).user_id;
    const projects = await getProjectsByClient(db, sessionId);
    const response = NextResponse.json(projects);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching projects', error as Error);
    const response = NextResponse.json({ error: `Failed to fetch projects: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

// POST /api/projects — admin (or the internal-portal service-token bridge) only.
// Accepts a client_email rather than a client_id since staff creating a project
// won't know the internal numeric id.
export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAdminOrServiceAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 }),
      traceId
    );
  }

  try {
    const body = await request.json() as {
      client_email?: string;
      name?: string;
      description?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
    };
    const { client_email, name, description, status, start_date, end_date } = body;

    const emailValidation = validateString(client_email, 'client_email');
    if (!emailValidation.valid) {
      return withSecurityHeaders(NextResponse.json({ error: emailValidation.errors.join(', ') }, { status: 400 }), traceId);
    }
    const nameValidation = validateString(name, 'name');
    if (!nameValidation.valid) {
      return withSecurityHeaders(NextResponse.json({ error: nameValidation.errors.join(', ') }, { status: 400 }), traceId);
    }

    const client = await getUserByEmail(db, client_email!);
    if (!client) {
      return withSecurityHeaders(NextResponse.json({ error: `No account found for ${client_email}` }, { status: 404 }), traceId);
    }

    const project = await createProject(db, {
      client_id: (client as any).id,
      name: name!,
      description,
      status,
      start_date,
      end_date,
    });

    const response = NextResponse.json(project, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error creating project', error as Error);
    const response = NextResponse.json({ error: `Project creation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
