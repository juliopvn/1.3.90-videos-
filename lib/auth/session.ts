import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { durationToSeconds } from "@/lib/auth/duration";
import { signSession, verifySession, type SessionPayload } from "@/lib/auth/jwt";

/**
 * Helpers de sesión para Route Handlers / Server Components (usan
 * `next/headers`, que no está disponible en middleware.ts).
 */
export async function createSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: durationToSeconds(env.jwtExpiresIn()),
  });
}

export async function destroySessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
