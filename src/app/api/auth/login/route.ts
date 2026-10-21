import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { errorResponse, readJson } from "@/lib/http";
import { hashPassword, isPbkdf2Hash, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const attemptLimit = 5;
const attemptWindowMs = 15 * 60 * 1000;
const passwordMaxLength = 128;

/** Autentica al usuario, limita intentos fallidos y crea una sesión al validar credenciales. */
export async function POST(request: NextRequest) {
  const now = Date.now();
  const body = await readJson<{ email?: unknown; password?: unknown }>(request);
  if (!body || typeof body.email !== "string" || typeof body.password !== "string" || body.password.length > passwordMaxLength) return errorResponse("Correo o contraseña válidos son obligatorios.", 400);
  const email = body.email.toLowerCase().trim();
  const entry = await prisma.loginAttempt.findUnique({ where: { email } });
  if (entry && entry.resetAt > new Date(now) && entry.count >= attemptLimit) return errorResponse("Demasiados intentos. Inténtalo de nuevo en unos minutos.", 429);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !(await verifyPassword(body.password, user.passwordHash))) {
    await prisma.loginAttempt.upsert({ where: { email }, update: { count: entry && entry.resetAt > new Date(now) ? entry.count + 1 : 1, resetAt: new Date(now + attemptWindowMs) }, create: { email, count: 1, resetAt: new Date(now + attemptWindowMs) } });
    return errorResponse("Correo o contraseña incorrectos.", 401);
  }
  if (!isPbkdf2Hash(user.passwordHash!)) {
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.password) } });
  }
  await prisma.loginAttempt.deleteMany({ where: { email } });
  await createSession(user.id);
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}
