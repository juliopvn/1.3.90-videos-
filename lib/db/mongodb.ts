import { MongoClient, type Db } from "mongodb";
import { env } from "@/lib/env";

/**
 * Cliente singleton de MongoDB.
 *
 * En desarrollo, Next.js recarga módulos en caliente en cada cambio de
 * archivo; sin cachear la conexión en `global`, cada recarga abriría una
 * conexión nueva a Mongo. En producción (una instancia de servidor por
 * proceso, o serverless con cold start) basta una promesa por proceso.
 */
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(env.mongodbUri());
  return client.connect();
}

const clientPromise: Promise<MongoClient> =
  process.env.NODE_ENV === "development"
    ? (global._mongoClientPromise ??= createClientPromise())
    : createClientPromise();

export async function getMongoClient(): Promise<MongoClient> {
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(env.mongodbDb());
}
