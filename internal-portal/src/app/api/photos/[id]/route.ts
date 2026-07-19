import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
  const { id } = await params;
    const photoId = parseInt(id);
    const body = await request.json() as {
      verified?: boolean;
    };
    const { verified } = body;
    const adminId = (user as any).user_id;

    await db.prepare(
      `UPDATE cleaning_photos 
       SET verified = ?, verified_by = ?, verified_at = datetime('now')
       WHERE id = ?`
    ).bind(verified ? 1 : 0, adminId, photoId).run();

    logger.info(`Photo ${photoId} verified by admin ${adminId}`, { photoId, verified, adminId });

    const response = NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error verifying photo', error as Error);
    const response = NextResponse.json({ error: `Failed to verify photo: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'cleaner', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
  const { id } = await params;
    const photoId = parseInt(id);
    const userId = (user as any).user_id;
    const userRole = (user as any).role;

    // Check ownership
    if (userRole !== 'admin') {
      const photo = await db.prepare('SELECT cleaner_id FROM cleaning_photos WHERE id = ?').bind(photoId).first();
      if (!photo || (photo as any).cleaner_id !== userId) {
        const response = NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        return withSecurityHeaders(response, traceId);
      }
    }

    await db.prepare('DELETE FROM cleaning_photos WHERE id = ?').bind(photoId).run();

    logger.info(`Photo ${photoId} deleted by user ${userId}`, { photoId, userId, userRole });

    const response = NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error deleting photo', error as Error);
    const response = NextResponse.json({ error: `Failed to delete photo: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
