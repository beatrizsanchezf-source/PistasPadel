import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse, readJson } from "@/lib/http";
import type { SessionUser } from "@/lib/auth";
import { createReservation } from "@/lib/reservation-use-cases";
import { logSanitizedError } from "@/lib/safe-log";

/** Campos no confiables aceptados al crear una reserva. */
type ReservationInput = { courtId?: unknown; userId?: unknown; startsAt?: unknown; players?: unknown; withLight?: unknown; status?: unknown };

/** Crea una reserva futura en punto dentro del horario del club, rechazando solapamientos. */
export async function POST(request: NextRequest) {
  let currentUser: SessionUser;
  try { currentUser = await requireUser(); } catch { return errorResponse("Inicia sesión para crear reservas.", 401); }
  const body = await readJson<ReservationInput>(request);
  if (!body) return errorResponse("Los datos de la reserva no son válidos.", 400);
  try {
    const result = await createReservation(body, currentUser);
    if (result.kind === "invalid") return errorResponse("La reserva debe ser futura, en punto y dentro del horario de 08:00 a 21:00.", 400);
    if (result.kind === "not_found") return errorResponse("La pista o el usuario no existen.", 404);
    if (result.kind === "conflict") return errorResponse("La pista ya tiene una reserva en ese horario.", 409);
    return NextResponse.json(result.reservation, { status: 201 });
  } catch (error) {
    logSanitizedError("No se ha podido crear la reserva.", error);
    return errorResponse("No se ha podido crear la reserva.", 500);
  }
}
