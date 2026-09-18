import { NextRequest, NextResponse } from "next/server";
import { ReservationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type ReservationInput = {
  courtId?: unknown;
  userId?: unknown;
  startsAt?: unknown;
  players?: unknown;
  withLight?: unknown;
  status?: unknown;
};

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es válido." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Los datos de la reserva no son válidos." }, { status: 400 });
  }

  const input = body as ReservationInput;
  const courtId = typeof input.courtId === "number" ? input.courtId : NaN;
  const startsAt = typeof input.startsAt === "string" ? new Date(input.startsAt) : new Date("");
  const status = input.status === ReservationStatus.PENDING || input.status === ReservationStatus.CONFIRMED ? input.status : null;

  if (!Number.isInteger(courtId) || typeof input.userId !== "string" || !input.userId || Number.isNaN(startsAt.getTime()) || !Number.isInteger(input.players) || input.players < 1 || input.players > 4 || typeof input.withLight !== "boolean" || !status) {
    return NextResponse.json({ error: "Los datos de la reserva no son válidos." }, { status: 400 });
  }

  const endsAt = new Date(startsAt);
  endsAt.setHours(endsAt.getHours() + 1);

  const [court, user, conflict] = await Promise.all([
    prisma.court.findUnique({ where: { id: courtId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } }),
    prisma.reservation.findFirst({ where: { courtId, status: { not: ReservationStatus.CANCELLED }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }),
  ]);

  if (!court || !user) return NextResponse.json({ error: "La pista o el usuario no existen." }, { status: 404 });
  if (conflict) return NextResponse.json({ error: "La pista ya tiene una reserva en ese horario." }, { status: 409 });

  const reservation = await prisma.reservation.create({
    data: { courtId, userId: input.userId, startsAt, endsAt, players: input.players, withLight: input.withLight, status },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(reservation, { status: 201 });
}
