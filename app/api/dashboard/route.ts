import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/lib/auth/session";
import { getVideosCollection } from "@/lib/db/models/video";

interface DashboardAggregation {
  _id: null;
  totalVideos: number;
  totalBytes: number;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const videos = await getVideosCollection();
  const [result] = await videos
    .aggregate<DashboardAggregation>([
      { $match: { userId: new ObjectId(user.sub) } },
      { $group: { _id: null, totalVideos: { $sum: 1 }, totalBytes: { $sum: "$tamaño" } } },
    ])
    .toArray();

  return NextResponse.json({
    totalVideos: result?.totalVideos ?? 0,
    totalBytes: result?.totalBytes ?? 0,
  });
}
