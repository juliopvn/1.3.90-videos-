import path from "node:path";
import { MongoClient } from "mongodb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Limpia los datos que la suite E2E creó (usuarios cuyo email empieza por
 * "e2e-" y sus vídeos, tanto en Mongo como en RustFS), para no ensuciar la
 * base de datos/bucket de desarrollo con cada corrida. No usa una base de
 * datos/bucket separados: basta con el prefijo, ver AGENTS.md.
 */
export default async function globalTeardown(): Promise<void> {
  try {
    process.loadEnvFile(path.resolve(__dirname, "../../.env.local"));
  } catch {
    // En CI las variables ya vienen inyectadas por el pipeline.
  }

  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;
  if (!mongoUri || !dbName) return;

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(dbName);

    const users = await db.collection("users").find({ email: /^e2e-/ }).toArray();
    const userIds = users.map((user) => user._id);
    if (userIds.length === 0) return;

    const videos = await db
      .collection("videos")
      .find({ userId: { $in: userIds } })
      .toArray();

    if (videos.length > 0 && process.env.RUSTFS_ENDPOINT) {
      const s3 = new S3Client({
        endpoint: process.env.RUSTFS_ENDPOINT,
        region: process.env.RUSTFS_REGION ?? "us-east-1",
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.RUSTFS_ACCESS_KEY ?? "",
          secretAccessKey: process.env.RUSTFS_SECRET_KEY ?? "",
        },
      });
      const bucket = process.env.RUSTFS_BUCKET ?? "videos";
      await Promise.allSettled(
        videos.map((video) => s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: video.s3Key })))
      );
    }

    await db.collection("videos").deleteMany({ userId: { $in: userIds } });
    await db.collection("users").deleteMany({ _id: { $in: userIds } });
  } catch (error) {
    console.error("[e2e teardown] no se pudo limpiar los datos de prueba", error);
  } finally {
    await client.close();
  }
}
