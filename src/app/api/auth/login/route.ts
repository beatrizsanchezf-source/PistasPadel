import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { errorResponse, readJson } from "@/lib/http";
import { logSanitizedError } from "@/lib/safe-log";
import { hashPassword, isPbkdf2Hash, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { containsUnsafeText, isValidEmail, normalizeEmail } from "@/lib/user-validation";

const attemptLimit = 5;
const attemptWindowMs = 15 * 60 * 1000;
const passwordMaxLength = 128;

/** Autentica al usuario, limita intentos fallidos y crea una sesión al validar credenciales. */
export async function POST(request: NextRequest) {
  const now = Date.now();
  const body = await readJson<{ email?: unknown; password?: unknown }>(request);
  if (!body || typeof body.email !== "string" || !isValidEmail(body.email) || typeof body.password !== "string" || body.password.length < 1 || body.password.length > passwordMaxLength || containsUnsafeText(body.password)) return errorResponse("Correo o contraseña válidos son obligatorios.", 400);
  const email = normalizeEmail(body.email);
  await prisma.loginAttempt.deleteMany({ where: { resetAt: { lte: new Date(now) } } });
  const entry = await prisma.loginAttempt.findUnique({ where: { email } });
  if (entry && entry.resetAt > new Date(now) && entry.count >= attemptLimit) return errorResponse("Demasiados intentos. Inténtalo de nuevo en unos minutos.", 429);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !(await verifyPassword(body.password, user.passwordHash))) {
    await prisma.loginAttempt.upsert({ where: { email }, update: { count: entry && entry.resetAt > new Date(now) ? entry.count + 1 : 1, resetAt: new Date(now + attemptWindowMs) }, create: { email, count: 1, resetAt: new Date(now + attemptWindowMs) } });
    return errorResponse("Correo o contraseña incorrectos.", 401);
  }
  if (!isPbkdf2Hash(user.passwordHash!)) {
    try {
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.password) } });
    } catch (error) {
      logSanitizedError("No se pudo migrar el hash de contraseña.", error);
      return errorResponse("No se pudo completar el inicio de sesión.", 500);
    }
  }
  await prisma.loginAttempt.deleteMany({ where: { email } });
  await createSession(user.id);
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}
