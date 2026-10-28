import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { errorResponse, readJson } from "@/lib/http";
import { logSanitizedError } from "@/lib/safe-log";
import { updateUser } from "@/lib/user-use-cases";

/**
 * Actualiza los datos y permisos de una cuenta existente.
 * Revoca sus sesiones al cambiar la contraseña y no permite degradar al último administrador.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try { await requireAdmin(); } catch { return errorResponse("No autorizado.", 403); }
  const body = await readJson<unknown>(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) return errorResponse("Los datos del usuario no son válidos.", 400);
  const { userId } = await params;
  try {
    const result = await updateUser(userId, body);
    if (result.kind === "invalid") return errorResponse(result.message, 400);
    if (result.kind === "not_found") return errorResponse("El cliente no existe.", 404);
    if (result.kind === "last_admin") return errorResponse("Debe existir al menos un administrador.", 400);
    if (result.kind === "duplicate_email") return errorResponse("Ya existe un usuario con ese correo.", 409);
    if (result.kind === "saved") return NextResponse.json(result.user);
  } catch (error) {
    logSanitizedError("No se ha podido actualizar el cliente.", error);
    return NextResponse.json({ error: "No se ha podido actualizar el cliente." }, { status: 500 });
  }
}
