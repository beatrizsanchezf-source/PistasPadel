import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, readJson } from "@/lib/http";
import { logSanitizedError } from "@/lib/safe-log";
import { createUser } from "@/lib/user-use-cases";

/** Lista usuarios sin datos de contraseña; requiere rol `ADMIN`. */
export async function GET() {
  try { await requireAdmin(); } catch { return errorResponse("No autorizado.", 403); }
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });

  return NextResponse.json(users);
}

/** Crea una cuenta validada con contraseña hasheada; requiere rol `ADMIN`. */
export async function POST(request: NextRequest) {
  try { await requireAdmin(); } catch { return errorResponse("No autorizado.", 403); }
  const body = await readJson<unknown>(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) return errorResponse("Los datos del usuario no son válidos.", 400);
  try {
    const result = await createUser(body);
    if (result.kind === "invalid") return errorResponse(result.message, 400);
    if (result.kind === "duplicate_email") return errorResponse("Ya existe un usuario con ese correo.", 409);
    if (result.kind === "saved") return NextResponse.json(result.user, { status: 201 });
  } catch (error) {
    logSanitizedError("No se ha podido crear el cliente.", error);
    return errorResponse("No se ha podido crear el cliente.", 500);
  }
}
