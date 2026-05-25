import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from "@/lib/middleware";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE || 'https://uploads.scratchsolidsolutions.org').replace(/\/$/, '');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB for profile pictures

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(req: NextRequest) {
  const traceId = withTracing(req);
  const authResult = await withAuth(req, ['cleaner', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  const csrfResponse = await withCsrf(req);
  if (csrfResponse) return withSecurityHeaders(csrfResponse, traceId);

  // Get R2 bucket from Cloudflare context
  let bucket: any;
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    bucket = env?.UPLOADS_BUCKET;
    if (!bucket) {
      return withSecurityHeaders(NextResponse.json({ error: 'R2 bucket binding not found' }, { status: 500 }), traceId);
    }
  } catch (error) {
    return withSecurityHeaders(NextResponse.json({ error: 'R2 bucket context error', details: (error as Error).message }, { status: 500 }), traceId);
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'profile-pictures';

    if (!file) {
      return withSecurityHeaders(NextResponse.json({ error: 'file is required' }, { status: 400 }), traceId);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return withSecurityHeaders(NextResponse.json({ error: 'File type not allowed. Use JPEG, PNG, GIF, or WebP.' }, { status: 400 }), traceId);
    }
    if (file.size > MAX_FILE_SIZE) {
      return withSecurityHeaders(NextResponse.json({ error: 'File exceeds 5MB limit' }, { status: 400 }), traceId);
    }

    const safeFilename = sanitizeFilename(file.name);
    const key = `${folder.replace(/\/+$/, '')}/${uuidv4()}-${safeFilename}`;

    // Upload file directly to R2 using the bucket binding
    await bucket.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    const publicUrl = `${PUBLIC_BASE}/${key}`;

    const response = NextResponse.json({
      key,
      publicUrl,
      filename: file.name,
      size: file.size,
      contentType: file.type,
    });
    return withSecurityHeaders(response, traceId);
  } catch (err) {
    const response = NextResponse.json({ error: 'Failed to upload file', details: (err as Error).message }, { status: 400 });
    return withSecurityHeaders(response, traceId);
  }
}
