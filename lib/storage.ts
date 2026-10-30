import "server-only";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// The only module that talks to object storage (Neon, S3-compatible). The client is built on first use so builds and tests need no env.
let cached: { client: S3Client; bucket: string } | undefined;

function s3() {
  if (cached) return cached;
  const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET } =
    process.env;
  if (!S3_ENDPOINT || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_BUCKET) {
    throw new Error(
      "Object storage is not configured: set S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_BUCKET.",
    );
  }
  cached = {
    bucket: S3_BUCKET,
    client: new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      // Custom endpoint: the bucket goes in the path, not a subdomain.
      forcePathStyle: true,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
      // SDK v3 defaults send checksums that many S3-compatible stores do not accept.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    }),
  };
  return cached;
}

export async function putImage(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const { client, bucket } = s3();
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
}

export async function deleteImage(key: string): Promise<void> {
  const { client, bucket } = s3();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function copyObject(fromKey: string, toKey: string): Promise<void> {
  const { client, bucket } = s3();
  await client.send(new CopyObjectCommand({ Bucket: bucket, Key: toKey, CopySource: `${bucket}/${fromKey}` }));
}

export async function presignGet(key: string): Promise<string> {
  const { client, bucket } = s3();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseCacheControl: "private, max-age=300",
    }),
    { expiresIn: 300 },
  );
}
