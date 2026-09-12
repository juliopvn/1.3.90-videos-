import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/lib/auth/session";
import { getVideosCollection, toVideoDTO } from "@/lib/db/models/video";
import { isNonEmptyString } from "@/lib/validation";

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE));

  const videos = await getVideosCollection();
  const filter = { userId: new ObjectId(user.sub) };

  const [docs, total] = await Promise.all([
    videos
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    videos.countDocuments(filter),
  ]);

  return NextResponse.json({
    items: docs.map(toVideoDTO),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { nombre, descripcion, tags, kv, s3Key, tamaño, contentType } = (body ?? {}) as Record<string, unknown>;

  if (!isNonEmptyString(nombre, 200)) {
    return NextResponse.json({ error: "El nombre del vídeo es obligatorio" }, { status: 400 });
  }
  if (!isNonEmptyString(s3Key, 500)) {
    return NextResponse.json(
      { error: "Falta s3Key: sube primero el archivo con la URL prefirmada de /api/videos/presign-upload" },
      { status: 400 }
    );
  }
  if (typeof tamaño !== "number" || !Number.isFinite(tamaño) || tamaño <= 0) {
    return NextResponse.json({ error: "tamaño debe ser un número positivo (bytes)" }, { status: 400 });
  }
  if (tags !== undefined && !Array.isArray(tags)) {
    return NextResponse.json({ error: "tags debe ser un array de strings" }, { status: 400 });
  }

  const normalizedTags = Array.isArray(tags)
    ? Array.from(
        new Set(
          tags
            .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
            .map((tag) => tag.trim().toLowerCase())
        )
      )
    : [];

  const normalizedKv: Record<string, string> = {};
  if (kv !== undefined) {
    if (typeof kv !== "object" || kv === null || Array.isArray(kv)) {
      return NextResponse.json({ error: "kv debe ser un objeto clave-valor de texto" }, { status: 400 });
    }
    for (const [key, value] of Object.entries(kv as Record<string, unknown>)) {
      if (typeof value !== "string") {
        return NextResponse.json({ error: `El valor de "${key}" en kv debe ser texto` }, { status: 400 });
      }
      if (key.trim().length === 0) continue;
      normalizedKv[key.trim()] = value.trim();
    }
  }

  const videos = await getVideosCollection();
  const now = new Date();

  const { insertedId } = await videos.insertOne({
    userId: new ObjectId(user.sub),
    s3Key,
    nombre: nombre.trim(),
    descripcion: isNonEmptyString(descripcion, 2000) ? descripcion.trim() : "",
    tags: normalizedTags,
    kv: normalizedKv,
    tamaño,
    contentType: typeof contentType === "string" ? contentType : "video/mp4",
    fecha: now,
    createdAt: now,
  });

  return NextResponse.json({ id: insertedId.toString() }, { status: 201 });
}
