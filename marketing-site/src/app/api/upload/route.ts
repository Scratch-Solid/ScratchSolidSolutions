import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// Multer-like parser for Next.js API routes
export const config = {
  api: {
    bodyParser: false,
  },
};

const REGION = "auto"; // R2 uses 'auto' region
const BUCKET = process.env.R2_BUCKET!;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;

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
  // @ts-ignore
  const buffer = Buffer.from(await file.arrayBuffer());
  return { buffer, filename: file.name, mimetype: file.type };
}

export async function POST(req: NextRequest) {
  try {
    const { buffer, filename, mimetype } = await parseFormData(req);
    const key = `${uuidv4()}-${filename}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        ACL: "public-read",
      })
    );
    const url = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${key}`;
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
