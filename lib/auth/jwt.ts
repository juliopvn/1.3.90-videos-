import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

/**
 * Lógica pura de firma/verificación de JWT (sin `next/headers`), para poder
 * importarla tanto desde Route Handlers como desde middleware.ts (Edge
 * runtime), donde `cookies()` de next/headers no está disponible.
 */
export interface SessionPayload {
  sub: string; // userId
  email: string;
  name: string;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.jwtSecret());
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.jwtExpiresIn())
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string" || typeof payload.email !== "string" || typeof payload.name !== "string") {
      return null;
    }
    return { sub: payload.sub, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}
