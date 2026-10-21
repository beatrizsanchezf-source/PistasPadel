import { NextRequest, NextResponse } from "next/server";
import { Prisma, ReservationStatus } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth";
import { clubTimeParts } from "@/lib/club-time";
import { errorResponse, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

/** Campos recibidos para modificar una reserva; se validan antes de persistirlos. */
type ReservationInput = { courtId?: unknown; userId?: unknown; startsAt?: unknown; players?: unknown; withLight?: unknown; status?: unknown; notes?: unknown };

type ReservationChanges = {
  courtId: number;
  userId: string;
  startsAt: Date;
  endsAt: Date;
  players: number;
  withLight: boolean;
  status: ReservationStatus;
  notes?: string | null;
};

const reservationInclude = { user: { select: { id: true, name: true } } } as const;
const scheduleConflictMessage = "La pista ya tiene una reserva en ese horario.";

function isPastUpdateValid(body: ReservationInput) {
  const allowedStatus = body.status === ReservationStatus.CONFIRMED
    || body.status === ReservationStatus.CANCELLED
    || body.status === ReservationStatus.NO_SHOW;
  const validNotes = body.notes === undefined || typeof body.notes === "string";
  return allowedStatus && validNotes;
}

async function updatePastReservation(reservationId: string, body: ReservationInput) {
  if (!isPastUpdateValid(body)) {
    return errorResponse("Tras la hora de inicio solo se pueden modificar el estado y las observaciones.", 400);
  }

  const updated = await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: body.status as ReservationStatus,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : undefined,
    },
    include: reservationInclude,
  });
  return NextResponse.json(updated);
}

function parseReservationChanges(body: ReservationInput): ReservationChanges | null {
  const courtId = typeof body.courtId === "number" ? body.courtId : Number.NaN;
  const userId = typeof body.userId === "string" ? body.userId : "";
  const players = typeof body.players === "number" ? body.players : Number.NaN;
  const startsAt = typeof body.startsAt === "string" ? new Date(body.startsAt) : new Date(Number.NaN);
  const validStatus = body.status === ReservationStatus.PENDING
    || body.status === ReservationStatus.CONFIRMED
    || body.status === ReservationStatus.CANCELLED;

  if (!Number.isInteger(courtId) || !userId || !Number.isInteger(players) || players < 1 || players > 4 || typeof body.withLight !== "boolean" || !validStatus || Number.isNaN(startsAt.getTime())) return null;

  const localTime = clubTimeParts(startsAt);
  if (localTime.minute !== 0 || localTime.second !== 0 || localTime.hour < 8 || localTime.hour > 21) return null;

  return {
    courtId,
    userId,
    startsAt,
    endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
    players,
    withLight: body.withLight,
    status: body.status as ReservationStatus,
    notes: typeof body.notes === "string" ? body.notes.trim() || null : undefined,
  };
}

async function findScheduleConflict(reservationId: string, changes: ReservationChanges) {
  if (changes.status === ReservationStatus.CANCELLED) return null;
  return prisma.reservation.findFirst({
    where: {
      id: { not: reservationId },
      courtId: changes.courtId,
      status: { not: ReservationStatus.CANCELLED },
      startsAt: { lt: changes.endsAt },
      endsAt: { gt: changes.startsAt },
    },
    select: { id: true },
  });
}

function isScheduleConflict(error: unknown) {
  if (error instanceof Error && error.message.includes("Reservation_active_court_no_overlap")) return true;
  return error instanceof Prisma.PrismaClientKnownRequestError
    && (error.code === "P2002" || (error.code === "P2010" && error.meta?.code === "23P01"));
}

async function updateFutureReservation(reservationId: string, body: ReservationInput) {
  const changes = parseReservationChanges(body);
  if (!changes) return errorResponse("La reserva debe ser en punto y dentro del horario de 08:00 a 21:00.", 400);

  const [court, user, conflict] = await Promise.all([
    prisma.court.findUnique({ where: { id: changes.courtId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: changes.userId }, select: { id: true } }),
    findScheduleConflict(reservationId, changes),
  ]);
  if (!court || !user) return errorResponse("La pista o el usuario no existen.", 404);
  if (conflict) return errorResponse(scheduleConflictMessage, 409);

  try {
    const updated = await prisma.reservation.update({ where: { id: reservationId }, data: changes, include: reservationInclude });
    return NextResponse.json(updated);
  } catch (error) {
    if (isScheduleConflict(error)) return errorResponse(scheduleConflictMessage, 409);
    console.error("No se ha podido actualizar la reserva.", error);
    return errorResponse("No se ha podido actualizar la reserva.", 500);
  }
}

/**
 * Actualiza una reserva; después de la hora de inicio solo permite estado y observaciones.
 * Requiere rol `ADMIN` y devuelve `409` cuando el horario se solapa con otra reserva activa.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ reservationId: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return errorResponse("Solo los administradores pueden modificar reservas.", 403);
  }

  const body = await readJson<ReservationInput>(request);
  if (!body) return errorResponse("Los datos de la reserva no son válidos.", 400);

  const { reservationId } = await params;
  const existing = await prisma.reservation.findUnique({ where: { id: reservationId }, select: { id: true, startsAt: true } });
  if (!existing) return errorResponse("La reserva no existe.", 404);
  if (existing.startsAt <= new Date()) return updatePastReservation(reservationId, body);
  return updateFutureReservation(reservationId, body);
}
