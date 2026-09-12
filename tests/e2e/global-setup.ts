import path from "node:path";
import { MongoClient } from "mongodb";

/**
 * Falla rápido y con un mensaje claro si Mongo/RustFS (docker-compose) no
 * están arriba, en vez de dejar que cada test individual falle con un
 * timeout críptico de fetch.
 */
export default async function globalSetup(): Promise<void> {
  try {
    process.loadEnvFile(path.resolve(__dirname, "../../.env.local"));
  } catch {
    // En CI las variables ya vienen inyectadas por el pipeline.
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error(
      'Falta MONGODB_URI. Copia .env.example a .env.local antes de correr "npm run test:e2e".'
    );
  }

  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
  } catch (error) {
    throw new Error(
      `No se pudo conectar a MongoDB en ${mongoUri}. ¿Está arriba "docker compose up -d"? (${String(error)})`
    );
  } finally {
    await client.close();
  }

  const rustfsEndpoint = process.env.RUSTFS_ENDPOINT;
  if (!rustfsEndpoint) {
    throw new Error('Falta RUSTFS_ENDPOINT en .env.local.');
  }

  const response = await fetch(`${rustfsEndpoint}/health`).catch(() => null);
  if (!response || !response.ok) {
    throw new Error(
      `No se pudo conectar a RustFS en ${rustfsEndpoint}. ¿Está arriba "docker compose up -d"?`
    );
  }
}
