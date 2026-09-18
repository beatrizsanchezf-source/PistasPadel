import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ courtId: string }> }) {
  const { courtId } = await params;
  const body = await request.json() as { lightsOn?: boolean };

  if (typeof body.lightsOn !== "boolean") return NextResponse.json({ error: "lightsOn debe ser booleano." }, { status: 400 });

  const court = await prisma.court.update({ where: { id: Number(courtId) }, data: { lightsOn: body.lightsOn } });
  return NextResponse.json(court);
}
