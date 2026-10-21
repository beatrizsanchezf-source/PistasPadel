import { NextResponse } from "next/server";

/** Mantiene el endpoint de bootstrap retirado y responde siempre `410 Gone`. */
export async function GET() {
  return NextResponse.json({ error: "Ruta eliminada." }, { status: 410 });
}
