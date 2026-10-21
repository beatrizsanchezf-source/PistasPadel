import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/** Cambia el estado de iluminación de una pista; requiere rol `ADMIN`. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ courtId: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Solo los administradores pueden controlar la iluminación." }, { status: 403 }); }
  const { courtId: rawCourtId } = await params;
  const courtId = Number(rawCourtId);
  const body = await request.json().catch(() => null) as { lightsOn?: boolean } | null;

  if (!Number.isInteger(courtId) || !body || typeof body.lightsOn !== "boolean") return NextResponse.json({ error: "Pista o datos de iluminación no válidos." }, { status: 400 });

  try { return NextResponse.json(await prisma.court.update({ where: { id: courtId }, data: { lightsOn: body.lightsOn } })); }
  catch { return NextResponse.json({ error: "La pista no existe." }, { status: 404 }); }
}
