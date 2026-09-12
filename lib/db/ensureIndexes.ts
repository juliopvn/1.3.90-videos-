import { getUsersCollection } from "@/lib/db/models/user";
import { getVideosCollection } from "@/lib/db/models/video";

let ensured: Promise<void> | null = null;

/**
 * Crea los índices necesarios si no existen. Memoizado: solo se ejecuta una
 * vez por proceso (se invoca desde instrumentation.ts al arrancar el server).
 */
export function ensureIndexes(): Promise<void> {
  if (!ensured) {
    ensured = createIndexes().catch((error) => {
      ensured = null; // permite reintentar en el próximo arranque si falló
      throw error;
    });
  }
  return ensured;
}

async function createIndexes(): Promise<void> {
  const [users, videos] = await Promise.all([getUsersCollection(), getVideosCollection()]);

  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true, name: "uniq_email" }),
    videos.createIndex({ userId: 1 }, { name: "by_user" }),
    videos.createIndex({ tags: 1 }, { name: "by_tags" }),
    videos.createIndex(
      { nombre: "text", descripcion: "text" },
      { name: "video_text_search", default_language: "spanish" }
    ),
  ]);
}
