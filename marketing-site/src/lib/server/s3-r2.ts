/**
 * @module s3-r2
 * @description Cloudflare R2Bucket-compatible facade backed by the S3 API.
 *
 * Cloudflare R2 is S3-compatible, so this keeps `env.UPLOADS_BUCKET.put(...)`
 * style calls working against either R2's S3 endpoint or a self-hosted
 * S3-compatible store (e.g. MinIO) on the Hetzner server.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return client;
}

type PutBody = ReadableStream | ArrayBuffer | Uint8Array | Buffer | Blob | string;

async function toBuffer(body: PutBody): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') return Buffer.from(body);
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof ArrayBuffer) return Buffer.from(new Uint8Array(body));
  // Blob or web ReadableStream -> use Response to normalise to ArrayBuffer.
  const ab = await new Response(body as BodyInit).arrayBuffer();
  return Buffer.from(ab);
}

interface R2PutOptions {
  httpMetadata?: { contentType?: string };
}

export class S3R2Bucket {
  constructor(private readonly bucket: string) {}

  async put(key: string, value: PutBody, options?: R2PutOptions): Promise<{ key: string }> {
    const Body = await toBuffer(value);
    await getClient().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body,
        ContentType: options?.httpMetadata?.contentType,
      })
    );
    return { key };
  }

  async get(key: string): Promise<{
    key: string;
    body: ReadableStream | null;
    arrayBuffer: () => Promise<ArrayBuffer>;
  } | null> {
    try {
      const res = await getClient().send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key })
      );
      const bytes = await res.Body?.transformToByteArray();
      const buf = bytes ? Buffer.from(bytes) : Buffer.alloc(0);
      return {
        key,
        body: null,
        arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await getClient().send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async head(key: string): Promise<{ key: string } | null> {
    try {
      await getClient().send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { key };
    } catch {
      return null;
    }
  }
}

let bucketSingleton: S3R2Bucket | null = null;
export function getR2Bucket(): S3R2Bucket {
  if (!bucketSingleton) {
    bucketSingleton = new S3R2Bucket(process.env.S3_BUCKET || 'scratchsolid-uploads');
  }
  return bucketSingleton;
}
