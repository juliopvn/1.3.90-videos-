import { NextRequest, NextResponse } from "next/server";
import { getUsersCollection, toUserDTO } from "@/lib/db/models/user";
import { hashPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/session";
import { isValidEmail, isNonEmptyString } from "@/lib/validation";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { name, email, password } = (body ?? {}) as Record<string, unknown>;

  if (!isNonEmptyString(name, 120)) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Introduce un email válido" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` },
      { status: 400 }
    );
  }

  const users = await getUsersCollection();
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = name.trim();

  const existing = await users.findOne({ email: normalizedEmail });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese email" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const createdAt = new Date();
  const { insertedId } = await users.insertOne({
    name: trimmedName,
    email: normalizedEmail,
    passwordHash,
    createdAt,
  });

  await createSessionCookie({ sub: insertedId.toString(), email: normalizedEmail, name: trimmedName });

  return NextResponse.json(
    toUserDTO({ _id: insertedId, name: trimmedName, email: normalizedEmail, passwordHash, createdAt }),
    { status: 201 }
  );
}
