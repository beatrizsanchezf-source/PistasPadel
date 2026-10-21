import { NextRequest, NextResponse } from "next/server";
import { Prisma, ReservationStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { clubTimeParts } from "@/lib/club-time";
import { prisma } from "@/lib/prisma";
import { errorResponse, readJson } from "@/lib/http";
import type { SessionUser } from "@/lib/auth";

/** Campos no confiables aceptados al crear una reserva. */
type ReservationInput = { courtId?: unknown; userId?: unknown; startsAt?: unknown; players?: unknown; withLight?: unknown; status?: unknown };

type PreparedReservation = {
  courtId: number;
  userId: string;
  startsAt: Date;
  endsAt: Date;
  players: number;
  withLight: boolean;
  status: ReservationStatus;
};

function isValidBookingTime(startsAt: Date) {
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) return false;
  const clubTime = clubTimeParts(startsAt);
  return clubTime.minute === 0 && clubTime.second === 0 && clubTime.hour >= 8 && clubTime.hour <= 21;
}

function prepareReservation(input: ReservationInput, currentUser: SessionUser): PreparedReservation | null {
  const courtId = typeof input.courtId === "number" ? input.courtId : Number.NaN;
  const players = typeof input.players === "number" ? input.players : Number.NaN;
  const startsAt = typeof input.startsAt === "string" ? new Date(input.startsAt) : new Date(Number.NaN);
  if (!Number.isInteger(courtId) || !Number.isInteger(players) || players < 1 || players > 4 || typeof input.withLight !== "boolean" || !isValidBookingTime(startsAt)) return null;

  const userId = currentUser.role === "ADMIN" && typeof input.userId === "string" ? input.userId : currentUser.id;
  const status = currentUser.role === "ADMIN" && (input.status === ReservationStatus.CONFIRMED || input.status === ReservationStatus.PENDING) ? input.status : ReservationStatus.PENDING;
  return { courtId, userId, startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000), players, withLight: input.withLight, status };
}

function isCourtScheduleConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && (error.code === "P2002" || (error.code === "P2010" && error.meta?.code === "23P01"))
    || error instanceof Error && error.message.includes("Reservation_active_court_no_overlap");
}

/** Crea una reserva futura en punto dentro del horario del club, rechazando solapamientos. */
export async function POST(request: NextRequest) {
  let currentUser: SessionUser;
  try { currentUser = await requireUser(); } catch { return errorResponse("Inicia sesión para crear reservas.", 401); }
  const body = await readJson<ReservationInput>(request);
  if (!body) return errorResponse("Los datos de la reserva no son válidos.", 400);
  const reservationData = prepareReservation(body, currentUser);
  if (!reservationData) return errorResponse("La reserva debe ser futura, en punto y dentro del horario de 08:00 a 21:00.", 400);
  const { courtId, userId, startsAt, endsAt, players, withLight, status } = reservationData;
  const [court, user, conflict] = await Promise.all([prisma.court.findUnique({ where: { id: courtId }, select: { id: true } }), prisma.user.findUnique({ where: { id: userId }, select: { id: true } }), prisma.reservation.findFirst({ where: { courtId, status: { not: ReservationStatus.CANCELLED }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }, select: { id: true } })]);
  if (!court || !user) return errorResponse("La pista o el usuario no existen.", 404);
  if (conflict) return errorResponse("La pista ya tiene una reserva en ese horario.", 409);
  try {
    const reservation = await prisma.reservation.create({ data: { courtId, userId, startsAt, endsAt, players, withLight, status }, include: { user: { select: { id: true, name: true } } } });
    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    if (isCourtScheduleConflict(error)) return errorResponse("La pista ya tiene una reserva en ese horario.", 409);
    console.error("No se ha podido crear la reserva.", error);
    return errorResponse("No se ha podido crear la reserva.", 500);
  }
}
