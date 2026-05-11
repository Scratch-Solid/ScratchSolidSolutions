import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { withAuth, withTracing, withSecurityHeaders } from "@/lib/middleware";
import { logger } from "@/lib/logger";
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const dynamic = "force-dynamic";

const REGION = "auto"; // R2 uses 'auto' region
const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE || 'https://uploads.scratchsolidsolutions.org').replace(/\/$/, '');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const URL_EXPIRY_SECONDS = 15 * 60; // 15 minutes

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(req: NextRequest) {
  const traceId = withTracing(req);
  const authResult = await withAuth(req, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  // Get R2 credentials from environment variables
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    logger.error('R2 environment variables missing', { accountId: !!accountId, accessKeyId: !!accessKeyId, secretAccessKey: !!secretAccessKey, bucketName: !!bucketName });
    return withSecurityHeaders(NextResponse.json({ error: 'R2 configuration missing' }, { status: 500 }), traceId);
  }

  const s3Client = new S3Client({
    region: REGION,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

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
      s3Client,
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: URL_EXPIRY_SECONDS }
    );

    const publicUrl = `${PUBLIC_BASE}/${key}`;

    const response = NextResponse.json({
      uploadUrl,
      key,
      publicUrl,
      expiresIn: URL_EXPIRY_SECONDS,
      requiredHeaders: { 'Content-Type': contentType },
      maxBytes: MAX_FILE_SIZE,
    });
    return withSecurityHeaders(response, traceId);
  } catch (err) {
    logger.error('Upload presign error', err as Error);
    const response = NextResponse.json({ error: 'Failed to create upload URL', details: (err as Error).message }, { status: 400 });
    return withSecurityHeaders(response, traceId);
  }
}
