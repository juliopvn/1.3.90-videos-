import { NextRequest, NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/db/models/user";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/session";
import { isValidEmail } from "@/lib/validation";

const GENERIC_ERROR = "Email o contraseña incorrectos";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { email, password } = (body ?? {}) as Record<string, unknown>;

  if (!isValidEmail(email) || typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const users = await getUsersCollection();
  const normalizedEmail = email.toLowerCase().trim();
  const user = await users.findOne({ email: normalizedEmail });

  if (!user) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await createSessionCookie({ sub: user._id!.toString(), email: user.email, name: user.name });

  return NextResponse.json({ id: user._id!.toString(), name: user.name, email: user.email });
}
