export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { validateString } from "@/lib/validation";
import { withAdminOrServiceAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { addProjectUpdate } from '@/lib/db';

// POST /api/projects/[id]/updates — post a changelog entry (admin / internal-portal only)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAdminOrServiceAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const { id } = await params;
    const body = await request.json() as { message?: string };
    const messageValidation = validateString(body.message, 'message', 1, 2000);
    if (!messageValidation.valid) {
      return withSecurityHeaders(NextResponse.json({ error: messageValidation.errors.join(', ') }, { status: 400 }), traceId);
    }

    const update = await addProjectUpdate(db, {
      project_id: Number(id),
      author_id: (user as any).user_id,
      message: body.message!,
    });
    return withSecurityHeaders(NextResponse.json(update, { status: 201 }), traceId);
  } catch (error) {
    logger.error('Error adding project update', error as Error);
    const response = NextResponse.json({ error: `Failed to add update: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
