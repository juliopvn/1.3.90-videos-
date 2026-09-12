/**
 * Se ejecuta una vez al arrancar el servidor Next.js (dev, start, o cold
 * start serverless). Crea los índices de Mongo y el bucket de S3/RustFS si
 * no existen, para que la app no dependa de un paso manual de "seed".
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensureIndexes } = await import("@/lib/db/ensureIndexes");
  const { ensureBucket } = await import("@/lib/s3/client");

  await Promise.all([
    ensureIndexes().catch((error) => {
      console.error("[instrumentation] no se pudieron crear los índices de Mongo", error);
    }),
    ensureBucket().catch((error) => {
      console.error("[instrumentation] no se pudo asegurar el bucket de RustFS", error);
    }),
  ]);
}
