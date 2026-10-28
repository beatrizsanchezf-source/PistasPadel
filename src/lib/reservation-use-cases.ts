import { Prisma, ReservationStatus, type PrismaClient } from "@/generated/prisma/client";
import { clubTimeParts } from "@/lib/club-time";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

export type CreateReservationInput = {
  courtId?: unknown;
  userId?: unknown;
  startsAt?: unknown;
  players?: unknown;
  withLight?: unknown;
  status?: unknown;
};

export type CreateReservationResult =
  | { kind: "invalid" }
  | { kind: "not_found" }
  | { kind: "conflict" }
  | { kind: "created"; reservation: Awaited<ReturnType<PrismaClient["reservation"]["create"]>> };

export type UpdateReservationInput = CreateReservationInput & { notes?: unknown };

export type UpdateReservationResult =
  | { kind: "invalid" }
  | { kind: "not_found" }
  | { kind: "conflict" }
  | { kind: "updated"; reservation: Awaited<ReturnType<PrismaClient["reservation"]["update"]>> };

const reservationInclude = { user: { select: { id: true, name: true } } } as const;
const unsafeNotesPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/;

function normalizeNotes(value: unknown) {
  if (value === undefined) return { valid: true as const, value: undefined };
  if (typeof value !== "string" || value.length > 500 || unsafeNotesPattern.test(value)) return { valid: false as const };
  return { valid: true as const, value: value.normalize("NFC").trim() || null };
}

function isValidBookingTime(startsAt: Date) {
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) return false;
  const clubTime = clubTimeParts(startsAt);
  return clubTime.minute === 0 && clubTime.second === 0 && clubTime.hour >= 8 && clubTime.hour <= 21;
}

function prepareReservation(input: CreateReservationInput, user: SessionUser) {
  const courtId = typeof input.courtId === "number" ? input.courtId : Number.NaN;
  const players = typeof input.players === "number" ? input.players : Number.NaN;
  const startsAt = typeof input.startsAt === "string" ? new Date(input.startsAt) : new Date(Number.NaN);
  if (!Number.isInteger(courtId) || !Number.isInteger(players) || players < 1 || players > 4 || typeof input.withLight !== "boolean" || !isValidBookingTime(startsAt)) return null;

  const userId = user.role === "ADMIN" && typeof input.userId === "string" ? input.userId : user.id;
  const status = user.role === "ADMIN" && (input.status === ReservationStatus.CONFIRMED || input.status === ReservationStatus.PENDING) ? input.status : ReservationStatus.PENDING;
  return { courtId, userId, startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000), players, withLight: input.withLight, status };
}

function isScheduleConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && (error.code === "P2002" || error.code === "P2034" || (error.code === "P2010" && error.meta?.code === "23P01"))
    || error instanceof Error && error.message.includes("Reservation_active_court_no_overlap");
}

function parseUpdate(input: UpdateReservationInput) {
  const notes = normalizeNotes(input.notes);
  if (!notes.valid) return null;
  const courtId = typeof input.courtId === "number" ? input.courtId : Number.NaN;
  const userId = typeof input.userId === "string" ? input.userId : "";
  const players = typeof input.players === "number" ? input.players : Number.NaN;
  const startsAt = typeof input.startsAt === "string" ? new Date(input.startsAt) : new Date(Number.NaN);
  const validStatus = input.status === ReservationStatus.PENDING
    || input.status === ReservationStatus.CONFIRMED
    || input.status === ReservationStatus.CANCELLED;
  if (!Number.isInteger(courtId) || !userId || !Number.isInteger(players) || players < 1 || players > 4 || typeof input.withLight !== "boolean" || !validStatus || Number.isNaN(startsAt.getTime())) return null;

  const localTime = clubTimeParts(startsAt);
  if (localTime.minute !== 0 || localTime.second !== 0 || localTime.hour < 8 || localTime.hour > 21) return null;
  return {
    courtId,
    userId,
    startsAt,
    endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
    players,
    withLight: input.withLight,
    status: input.status as ReservationStatus,
    notes: notes.value,
  };
}

function isPastUpdateValid(input: UpdateReservationInput) {
  const notes = normalizeNotes(input.notes);
  const allowedStatus = input.status === ReservationStatus.CONFIRMED
    || input.status === ReservationStatus.CANCELLED
    || input.status === ReservationStatus.NO_SHOW;
  return allowedStatus && notes.valid;
}

export async function updateReservation(
  reservationId: string,
  input: UpdateReservationInput,
  database: PrismaClient = prisma,
  now = new Date(),
): Promise<UpdateReservationResult> {
  const existing = await database.reservation.findUnique({ where: { id: reservationId }, select: { id: true, startsAt: true } });
  if (!existing) return { kind: "not_found" };

  if (existing.startsAt <= now) {
    if (!isPastUpdateValid(input)) return { kind: "invalid" };
    const notes = normalizeNotes(input.notes);
    const reservation = await database.reservation.update({
      where: { id: reservationId },
      data: {
        status: input.status as ReservationStatus,
        notes: notes.valid ? notes.value : undefined,
      },
      include: reservationInclude,
    });
    return { kind: "updated", reservation };
  }

  const changes = parseUpdate(input);
  if (!changes) return { kind: "invalid" };
  const [court, user, conflict] = await Promise.all([
    database.court.findUnique({ where: { id: changes.courtId }, select: { id: true } }),
    database.user.findUnique({ where: { id: changes.userId }, select: { id: true } }),
    changes.status === ReservationStatus.CANCELLED ? null : database.reservation.findFirst({
      where: {
        id: { not: reservationId },
        courtId: changes.courtId,
        status: { not: ReservationStatus.CANCELLED },
        startsAt: { lt: changes.endsAt },
        endsAt: { gt: changes.startsAt },
      },
      select: { id: true },
    }),
  ]);
  if (!court || !user) return { kind: "not_found" };
  if (conflict) return { kind: "conflict" };

  try {
    const reservation = await database.reservation.update({ where: { id: reservationId }, data: changes, include: reservationInclude });
    return { kind: "updated", reservation };
  } catch (error) {
    if (isScheduleConflict(error)) return { kind: "conflict" };
    throw error;
  }
}

export async function createReservation(
  input: CreateReservationInput,
  user: SessionUser,
  database: PrismaClient = prisma,
): Promise<CreateReservationResult> {
  const data = prepareReservation(input, user);
  if (!data) return { kind: "invalid" };

  const [court, targetUser, conflict] = await Promise.all([
    database.court.findUnique({ where: { id: data.courtId }, select: { id: true } }),
    database.user.findUnique({ where: { id: data.userId }, select: { id: true } }),
    database.reservation.findFirst({
      where: {
        courtId: data.courtId,
        status: { not: ReservationStatus.CANCELLED },
        startsAt: { lt: data.endsAt },
        endsAt: { gt: data.startsAt },
      },
      select: { id: true },
    }),
  ]);
  if (!court || !targetUser) return { kind: "not_found" };
  if (conflict) return { kind: "conflict" };

  try {
    const reservation = await database.reservation.create({
      data,
      include: { user: { select: { id: true, name: true } } },
    });
    return { kind: "created", reservation };
  } catch (error) {
    if (isScheduleConflict(error)) return { kind: "conflict" };
    throw error;
  }
}
