import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
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
 * Crea el bucket si no existe y (re)aplica su política CORS. Memoizado: se
 * invoca una vez al arrancar (instrumentation.ts) y de forma defensiva antes
 * de firmar una URL de subida, por si el bucket fue borrado manualmente.
 *
 * La política CORS es necesaria incluso en local: el navegador sirve la app
 * en el origen de Next.js (p. ej. http://localhost:3000) y sube/reproduce
 * contra el origen de RustFS (http://localhost:9001) — son orígenes
 * distintos aunque compartan host, así que sin CORS el PUT/GET directo
 * queda bloqueado por el navegador antes de llegar a RustFS. En producción
 * (Cloudflare R2) aplica exactamente el mismo razonamiento, ver Fase 13.
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

  const exists = await client
    .send(new HeadBucketCommand({ Bucket: bucket }))
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    // Si otro request ganó la carrera y ya lo creó (o el proveedor no deja
    // recrear un bucket con el mismo nombre), no lo tratamos como fatal:
    // lo que importa es que exista, no quién lo creó.
    await client.send(new CreateBucketCommand({ Bucket: bucket })).catch((error) => {
      console.warn(`[s3] CreateBucket para "${bucket}" falló (¿ya existía?): ${String(error)}`);
    });
  }

  // Algunos proveedores S3-compatible (p. ej. Cloudflare R2) no exponen
  // PutBucketCors por la API S3 y requieren configurarlo desde su propio
  // dashboard/CLI. No dejamos que eso tumbe la generación de la URL
  // prefirmada: si falla, solo avisamos — el bucket puede ya tener CORS
  // configurado manualmente (ver Fase 13 / AGENTS.md).
  try {
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: [env.appUrl()],
              AllowedMethods: ["GET", "PUT", "HEAD"],
              // Explícitos a propósito: algunos proveedores S3-compatible
              // (Cloudflare R2 incluido) no respetan el wildcard "*" en
              // AllowedHeaders de forma fiable. "content-type" lo manda el
              // PUT de subida; "range" lo manda el <video> al hacer seek.
              AllowedHeaders: ["content-type", "range"],
              ExposeHeaders: ["ETag"],
              MaxAgeSeconds: 3000,
            },
          ],
        },
      })
    );
  } catch (error) {
    console.warn(
      `[s3] no se pudo aplicar CORS automáticamente al bucket "${bucket}" (el proveedor puede no ` +
        `soportar PutBucketCors por API S3). Configúralo manualmente si la subida/reproducción falla ` +
        `por CORS en el navegador. Detalle: ${String(error)}`
    );
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
