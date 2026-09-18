import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");
  const date = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();

  if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Fecha no válida." }, { status: 400 });

  const end = new Date(date);
  end.setDate(end.getDate() + 1);

  const courts = await prisma.court.findMany({
    orderBy: { id: "asc" },
    include: {
      reservations: {
        where: { startsAt: { gte: date, lt: end } },
        orderBy: { startsAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  return NextResponse.json(courts);
}
