import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

const UPLOAD_URL_TTL_SECONDS = 15 * 60; // 15 minutos: tiempo de subir el archivo
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60; // 1 hora: tiempo de ver el vídeo

let s3Client: S3Client | null = null;

/**
 * Cliente S3 parametrizado solo por variables de entorno (endpoint, región,
 * credenciales). En Fase 13 (producción) el mismo código apunta a Cloudflare
 * R2 sin ningún cambio, solo cambiando RUSTFS_ENDPOINT/RUSTFS_REGION/claves.
 */
export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: env.rustfsEndpoint(),
      region: env.rustfsRegion(),
      forcePathStyle: true, // requerido por RustFS/MinIO-style endpoints
      credentials: {
        accessKeyId: env.rustfsAccessKey(),
        secretAccessKey: env.rustfsSecretKey(),
      },
    });
  }
  return s3Client;
}

let bucketEnsured: Promise<void> | null = null;

/**
 * Crea el bucket si no existe. Memoizado: se invoca una vez al arrancar
 * (instrumentation.ts) y de forma defensiva antes de firmar una URL de
 * subida, por si el bucket fue borrado manualmente en local.
 */
export function ensureBucket(): Promise<void> {
  if (!bucketEnsured) {
    bucketEnsured = createBucketIfMissing().catch((error) => {
      bucketEnsured = null;
      throw error;
    });
  }
  return bucketEnsured;
}

async function createBucketIfMissing(): Promise<void> {
  const client = getS3Client();
  const bucket = env.rustfsBucket();
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export async function createUploadUrl(key: string, contentType: string): Promise<string> {
  await ensureBucket();
  const command = new PutObjectCommand({
    Bucket: env.rustfsBucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
}

export async function createDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.rustfsBucket(), Key: key });
  return getSignedUrl(getS3Client(), command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
}

export async function deleteObject(key: string): Promise<void> {
  await getS3Client().send(new DeleteObjectCommand({ Bucket: env.rustfsBucket(), Key: key }));
}
