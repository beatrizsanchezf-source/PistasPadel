import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse, readJson } from "@/lib/http";
import { normalizeUserInput, validateUserInput, type UserInput } from "@/lib/user-validation";

/**
 * Actualiza los datos y permisos de una cuenta existente.
 * Revoca sus sesiones al cambiar la contraseña y no permite degradar al último administrador.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try { await requireAdmin(); } catch { return errorResponse("No autorizado.", 403); }
  const body = await readJson<UserInput>(request);
  const validationError = body ? validateUserInput(body, { passwordRequired: false }) : "Los datos del usuario no son válidos.";
  if (validationError) return errorResponse(validationError, 400);

  const { userId } = await params;
  const userInput = normalizeUserInput(body!);
  const passwordHash = typeof body!.password === "string" && body!.password ? await hashPassword(body!.password) : undefined;
  try {
    const user = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!target) throw new Error("NOT_FOUND");
      if (target.role === "ADMIN" && userInput.role === "CUSTOMER" && await tx.user.count({ where: { role: "ADMIN" } }) === 1) throw new Error("LAST_ADMIN");
      const updated = await tx.user.update({ where: { id: userId }, data: { ...userInput, ...(passwordHash ? { passwordHash } : {}) }, select: { id: true, name: true, email: true, phone: true, role: true } });
      if (passwordHash) await tx.session.deleteMany({ where: { userId } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return NextResponse.json({ error: "El cliente no existe." }, { status: 404 });
    if (error instanceof Error && error.message === "LAST_ADMIN") return NextResponse.json({ error: "Debe existir al menos un administrador." }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Ya existe un usuario con ese correo." }, { status: 409 });
    console.error("No se ha podido actualizar el cliente.", error);
    return NextResponse.json({ error: "No se ha podido actualizar el cliente." }, { status: 500 });
  }
}
