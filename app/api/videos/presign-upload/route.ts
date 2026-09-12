import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createUploadUrl } from "@/lib/s3/client";
import { isNonEmptyString } from "@/lib/validation";

const ALLOWED_CONTENT_TYPES = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime"]);
const MAX_FILE_NAME_LENGTH = 200;

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { fileName, contentType } = (body ?? {}) as Record<string, unknown>;

  if (!isNonEmptyString(fileName, MAX_FILE_NAME_LENGTH)) {
    return NextResponse.json({ error: "fileName es obligatorio" }, { status: 400 });
  }
  if (typeof contentType !== "string" || !ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: "Tipo de vídeo no soportado (usa mp4, webm, ogg o mov)" },
      { status: 400 }
    );
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const s3Key = `videos/${user.sub}/${crypto.randomUUID()}-${safeName}`;

  try {
    const uploadUrl = await createUploadUrl(s3Key, contentType);
    return NextResponse.json({ uploadUrl, s3Key });
  } catch (error) {
    console.error("[presign-upload] fallo generando URL prefirmada", error);
    return NextResponse.json({ error: "No se pudo preparar la subida" }, { status: 502 });
  }
}
