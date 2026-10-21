import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const sessionCookie = "pistas_padel_session";

/** Datos mínimos de la cuenta autenticada que pueden exponerse a la aplicación. */
export type SessionUser = { id: string; name: string; email: string; role: "ADMIN" | "CUSTOMER" };

/** Crea una sesión aleatoria, guarda su hash y establece la cookie segura del navegador. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await prisma.session.create({ data: { token: createHash("sha256").update(token).digest("hex"), userId, expiresAt } });
  const store = await cookies();
  store.set(sessionCookie, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", expires: expiresAt, path: "/" });
}

/** Recupera el usuario de la cookie actual y elimina sesiones expiradas. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token: createHash("sha256").update(token).digest("hex") }, include: { user: { select: { id: true, name: true, email: true, role: true } } } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

/** Elimina la sesión actual de PostgreSQL y borra su cookie. */
export async function deleteSession() {
  const store = await cookies();
  const token = store.get(sessionCookie)?.value;
  if (token) await prisma.session.deleteMany({ where: { token: createHash("sha256").update(token).digest("hex") } });
  store.delete(sessionCookie);
}

/** Devuelve el usuario autenticado o lanza `UNAUTHORIZED` si no existe sesión válida. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

/** Devuelve el usuario autenticado o lanza `FORBIDDEN` si no tiene rol administrador. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}
