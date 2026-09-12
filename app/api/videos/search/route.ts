import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/lib/auth/session";
import { getVideosCollection, toVideoDTO } from "@/lib/db/models/video";

const MAX_RESULTS = 50;

/**
 * Combina texto libre (nombre/descripcion), tags y pares clave-valor.
 *
 * - q: búsqueda de texto completo sobre el índice de texto nombre+descripcion
 * - tags: lista separada por comas, coincidencia exacta (AND) sobre tags[]
 * - kv: pares "clave:valor" separados por comas, ej. "proyecto:demo,cliente:acme"
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const tagsParam = searchParams.get("tags")?.trim();
  const kvParam = searchParams.get("kv")?.trim();

  const filter: Record<string, unknown> = { userId: new ObjectId(user.sub) };

  if (q) {
    filter.$text = { $search: q };
  }

  if (tagsParam) {
    const tags = tagsParam
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);
    if (tags.length > 0) {
      filter.tags = { $all: tags };
    }
  }

  if (kvParam) {
    for (const pair of kvParam.split(",")) {
      const trimmedPair = pair.trim();
      if (!trimmedPair) continue;
      const separatorIndex = trimmedPair.indexOf(":");
      if (separatorIndex <= 0) continue;
      const key = trimmedPair.slice(0, separatorIndex).trim();
      const value = trimmedPair.slice(separatorIndex + 1).trim();
      if (key && value) {
        filter[`kv.${key}`] = value;
      }
    }
  }

  const videos = await getVideosCollection();
  const docs = await videos.find(filter).sort({ createdAt: -1 }).limit(MAX_RESULTS).toArray();

  return NextResponse.json({ items: docs.map(toVideoDTO) });
}
