import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const s3 = new S3Client({
  region: REGION,
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

async function parseFormData(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") throw new Error("No file uploaded");
  const fileObj = file as File;
  const buffer = Buffer.from(await fileObj.arrayBuffer());
  if (buffer.length > MAX_FILE_SIZE) throw new Error("File exceeds 5MB limit");
  if (!ALLOWED_MIME_TYPES.includes(fileObj.type)) throw new Error("File type not allowed. Accepted: JPEG, PNG, GIF, WebP, PDF");
  const safeFilename = fileObj.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return { buffer, filename: safeFilename, mimetype: fileObj.type };
}

export async function POST(req: NextRequest) {
  const traceId = withTracing(req);
  const authResult = await withAuth(req);
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
    const { buffer, filename, mimetype } = await parseFormData(req);
    const key = `${uuidv4()}-${filename}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      })
    );
    const url = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${key}`;
    const response = NextResponse.json({ url });
    return withSecurityHeaders(response, traceId);
  } catch (err) {
    logger.error('Upload error', err as Error);
    const response = NextResponse.json({ error: (err as Error).message }, { status: 400 });
    return withSecurityHeaders(response, traceId);
  }
}
