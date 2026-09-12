import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db/mongodb";

/**
 * Los nombres de campo (nombre, descripcion, tamaño, fecha) siguen
 * deliberadamente el vocabulario del dominio definido en PROMT.md en vez de
 * traducirse a inglés, para que el esquema de Mongo sea legible junto a la
 * especificación del proyecto.
 */
export interface VideoDocument {
  _id?: ObjectId;
  userId: ObjectId;
  s3Key: string;
  nombre: string;
  descripcion: string;
  tags: string[];
  kv: Record<string, string>;
  tamaño: number; // bytes
  contentType: string;
  fecha: Date;
  createdAt: Date;
}

export interface VideoDTO {
  id: string;
  nombre: string;
  descripcion: string;
  tags: string[];
  kv: Record<string, string>;
  tamaño: number;
  contentType: string;
  fecha: string;
  createdAt: string;
}

export async function getVideosCollection(): Promise<Collection<VideoDocument>> {
  const db = await getDb();
  return db.collection<VideoDocument>("videos");
}

export function toVideoDTO(doc: VideoDocument & { _id: ObjectId }): VideoDTO {
  return {
    id: doc._id.toString(),
    nombre: doc.nombre,
    descripcion: doc.descripcion,
    tags: doc.tags,
    kv: doc.kv,
    tamaño: doc.tamaño,
    contentType: doc.contentType,
    fecha: doc.fecha.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}
