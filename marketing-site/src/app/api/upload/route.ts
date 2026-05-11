import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { withAuth, withTracing, withSecurityHeaders } from "@/lib/middleware";
import { logger } from "@/lib/logger";
import { withRateLimit, rateLimits } from "@/lib/middleware";

export const dynamic = "force-dynamic";

const REGION = "auto"; // R2 uses 'auto' region
const BUCKET = process.env.R2_BUCKET!;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE || 'https://uploads.scratchsolidsolutions.org').replace(/\/$/, '');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const URL_EXPIRY_SECONDS = 15 * 60; // 15 minutes

const s3 = new S3Client({
  region: REGION,
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(req: NextRequest) {
  const traceId = withTracing(req);
  const authResult = await withAuth(req, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  // Rate limiting check
  const rateLimitResult = await withRateLimit(req, rateLimits.strict);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many upload requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

  try {
    const body = await req.json() as { filename?: string; contentType?: string; contentLength?: number; folder?: string };
    const { filename, contentType = 'application/octet-stream', contentLength = 0, folder } = body;

    if (!filename) {
      return withSecurityHeaders(NextResponse.json({ error: 'filename is required' }, { status: 400 }), traceId);
    }
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return withSecurityHeaders(NextResponse.json({ error: 'File type not allowed. Use JPEG, PNG, GIF, WebP, or PDF.' }, { status: 400 }), traceId);
    }
    if (contentLength > MAX_FILE_SIZE) {
      return withSecurityHeaders(NextResponse.json({ error: 'File exceeds 8MB limit' }, { status: 400 }), traceId);
    }

    const safeFilename = sanitizeFilename(filename);
    const key = `${folder ? `${folder.replace(/\/+$/, '')}/` : ''}${uuidv4()}-${safeFilename}`;

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
        ContentLength: contentLength,
      }),
      { expiresIn: URL_EXPIRY_SECONDS }
    );

    const publicUrl = `${PUBLIC_BASE}/${key}`;
    const fallbackUrl = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${key}`;

    const response = NextResponse.json({
      uploadUrl,
      key,
      publicUrl,
      fallbackUrl,
      expiresIn: URL_EXPIRY_SECONDS,
      requiredHeaders: { 'Content-Type': contentType },
      maxBytes: MAX_FILE_SIZE,
    });
    return withSecurityHeaders(response, traceId);
  } catch (err) {
    logger.error('Upload presign error', err as Error);
    const response = NextResponse.json({ error: 'Failed to create upload URL' }, { status: 400 });
    return withSecurityHeaders(response, traceId);
  }
}
