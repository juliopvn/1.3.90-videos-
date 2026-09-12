import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/lib/auth/session";
import { getVideosCollection } from "@/lib/db/models/video";
import { createDownloadUrl } from "@/lib/s3/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Id de vídeo inválido" }, { status: 400 });
  }

  const videos = await getVideosCollection();
  const video = await videos.findOne({ _id: new ObjectId(id), userId: new ObjectId(user.sub) });

  if (!video) {
    return NextResponse.json({ error: "Vídeo no encontrado" }, { status: 404 });
  }

  const url = await createDownloadUrl(video.s3Key);
  return NextResponse.json({ url });
}
