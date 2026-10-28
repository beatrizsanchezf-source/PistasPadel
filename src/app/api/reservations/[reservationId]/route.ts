import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { errorResponse, isRecord, readJson } from "@/lib/http";
import { updateReservation, type UpdateReservationInput } from "@/lib/reservation-use-cases";
import { containsUnsafeText } from "@/lib/user-validation";
import { logSanitizedError } from "@/lib/safe-log";

/** Actualiza una reserva; la autorización y las reglas de dominio se aplican en servidor. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ reservationId: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return errorResponse("Solo los administradores pueden modificar reservas.", 403);
  }

  const body = await readJson<unknown>(request);
  if (!isRecord(body)) return errorResponse("Los datos de la reserva no son válidos.", 400);

  const { reservationId } = await params;
  if (reservationId.length > 64 || containsUnsafeText(reservationId)) return errorResponse("El identificador de reserva no es válido.", 400);
  try {
    const result = await updateReservation(reservationId, body as UpdateReservationInput);
    if (result.kind === "not_found") return errorResponse("La reserva, pista o usuario no existen.", 404);
    if (result.kind === "invalid") return errorResponse("La reserva no cumple las reglas de actualización.", 400);
    if (result.kind === "conflict") return errorResponse("La pista ya tiene una reserva en ese horario.", 409);
    return NextResponse.json(result.reservation);
  } catch (error) {
    logSanitizedError("No se ha podido actualizar la reserva.", error);
    return errorResponse("No se ha podido actualizar la reserva.", 500);
  }
}
