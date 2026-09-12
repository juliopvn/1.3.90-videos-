import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";

/**
 * Health check de infraestructura: confirma lectura/escritura real contra
 * MongoDB (no solo que exista una conexión abierta).
 */
export async function GET() {
  try {
    const db = await getDb();
    const collection = db.collection("_health_check");

    const { insertedId } = await collection.insertOne({ pingedAt: new Date() });
    const found = await collection.findOne({ _id: insertedId });
    await collection.deleteOne({ _id: insertedId });

    return NextResponse.json({
      status: "ok",
      mongodb: found ? "read/write ok" : "read failed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[health] fallo de conexión a MongoDB", error);
    return NextResponse.json(
      { status: "error", mongodb: "unreachable" },
      { status: 503 }
    );
  }
}
