export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { validateString } from "@/lib/validation";
import { withAdminOrServiceAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { addProjectFile } from '@/lib/db';

// POST /api/projects/[id]/files — record a file/link against the project
// (admin / internal-portal only). Actual file bytes go through the existing
// /api/upload endpoint first; this just records the resulting name/URL.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAdminOrServiceAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const { id } = await params;
    const body = await request.json() as { file_name?: string; file_url?: string; file_type?: string };
    const nameValidation = validateString(body.file_name, 'file_name');
    if (!nameValidation.valid) {
      return withSecurityHeaders(NextResponse.json({ error: nameValidation.errors.join(', ') }, { status: 400 }), traceId);
    }
    const urlValidation = validateString(body.file_url, 'file_url');
    if (!urlValidation.valid) {
      return withSecurityHeaders(NextResponse.json({ error: urlValidation.errors.join(', ') }, { status: 400 }), traceId);
    }

    const file = await addProjectFile(db, {
      project_id: Number(id),
      uploaded_by: (user as any).user_id,
      file_name: body.file_name!,
      file_url: body.file_url!,
      file_type: body.file_type,
    });
    return withSecurityHeaders(NextResponse.json(file, { status: 201 }), traceId);
  } catch (error) {
    logger.error('Error adding project file', error as Error);
    const response = NextResponse.json({ error: `Failed to add file: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
