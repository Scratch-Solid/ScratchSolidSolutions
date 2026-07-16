export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

/**
 * POST /api/v2/jobs/[id]/photos/upload
 * Upload a job photo directly to R2.
 * Body: { room_name, base64_image, file_name?, content_type? }
 * Returns the public URL and records it in job_photos.
 * Auth: admin, staff, or cleaner
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'staff', 'cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
  const { id } = await params;
    const jobId = id;
    const body = (await request.json()) as any;
    const { room_name, base64_image, file_name = 'photo.jpg', content_type = 'image/jpeg' } = body;

    if (!room_name || !base64_image) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: 'Missing room_name or base64_image' },
          { status: 400 }
        ),
        traceId
      );
    }

    // Verify job exists
    const job = await db
      .prepare('SELECT id, status FROM jobs WHERE id = ?')
      .bind(jobId)
      .first<{ id: string; status: string }>();

    if (!job) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 }),
        traceId
      );
    }

    // Decode base64
    const base64Data = base64_image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    if (imageBuffer.length > 10 * 1024 * 1024) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: 'Image exceeds 10MB limit' },
          { status: 413 }
        ),
        traceId
      );
    }

    // Generate unique object key
    const timestamp = Date.now();
    const sanitizedFileName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `jobs/${jobId}/${room_name}/${timestamp}_${sanitizedFileName}`;

    // Get R2 bucket binding from Cloudflare context
    const { env } = await import('@/lib/runtime-context').then((m) =>
      m.getCloudflareContext({ async: true })
    ) as unknown as { env: any };

    const bucket = env?.CLEANER_PHOTOS_BUCKET;
    if (!bucket) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: 'Storage not configured' },
          { status: 503 }
        ),
        traceId
      );
    }

    // Upload to R2
    await bucket.put(objectKey, imageBuffer, {
      httpMetadata: { contentType: content_type },
      customMetadata: {
        'job-id': jobId,
        'room-name': room_name,
        'uploaded-by': user?.paysheet_code || user?.name || 'unknown',
      },
    });

    const publicUrl = `${(process.env.R2_PUBLIC_BASE || 'https://uploads.scratchsolidsolutions.org').replace(/\/$/, '')}/${objectKey}`;

    // Record in job_photos
    const uploadedBy = user?.paysheet_code || user?.name || 'unknown';
    await db
      .prepare(
        `INSERT INTO job_photos (job_id, room_name, photo_url, uploaded_by, uploaded_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      )
      .bind(jobId, room_name, publicUrl, uploadedBy)
      .run();

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        message: 'Photo uploaded successfully',
        data: {
          public_url: publicUrl,
          object_key: objectKey,
          size_bytes: imageBuffer.length,
          content_type,
        },
      }),
      traceId
    );
  } catch (error) {
    console.error('Photo upload error:', error);
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to upload photo', traceId },
        { status: 500 }
      ),
      traceId
    );
  }
}
