/**
 * SOULDAWN — загрузка файлов в Cloudflare R2 (S3-совместимый).
 * Без ENV (R2_*) работа с R2 отключена — админка использует fallback на ручной URL.
 *
 * ENV:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_URL
  );
}

function client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
  });
}

// Заливает файл и возвращает публичный URL.
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET as string,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  const base = (process.env.R2_PUBLIC_URL as string).replace(/\/+$/, "");
  return `${base}/${key}`;
}
