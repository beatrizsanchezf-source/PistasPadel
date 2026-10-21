import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ReservationStatus } from "@/generated/prisma/client";
import { clubDayBounds } from "@/lib/club-time";

/**
 * Devuelve la agenda del día indicado en la zona `Europe/Madrid`.
 * Los clientes reciben datos anonimizados de reservas ajenas; administradores ven el detalle completo.
 * @returns `401` sin sesión y `400` si la fecha no tiene formato o no existe.
 */
export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Inicia sesión para consultar la agenda." }, { status: 401 });
  const dateParam = request.nextUrl.searchParams.get("date") ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const bounds = clubDayBounds(dateParam);
  if (!bounds) return NextResponse.json({ error: "Fecha no válida." }, { status: 400 });

  const courts = await prisma.court.findMany({
    orderBy: { id: "asc" },
    include: {
      reservations: {
        where: { status: { not: ReservationStatus.CANCELLED }, startsAt: { gte: bounds.start, lt: bounds.end } },
        orderBy: { startsAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (currentUser.role !== "ADMIN") return NextResponse.json(courts.map((court) => ({ id: court.id, name: court.name, description: court.description, lightsOn: court.lightsOn, reservations: court.reservations.map((reservation) => reservation.user.id === currentUser.id ? { id: reservation.id, startsAt: reservation.startsAt, players: reservation.players, withLight: reservation.withLight, status: reservation.status, user: { name: reservation.user.name } } : { startsAt: reservation.startsAt, players: reservation.players, withLight: false, status: reservation.status, user: { name: "Reservada" } }) })));
  return NextResponse.json(courts);
}
