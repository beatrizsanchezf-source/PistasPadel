import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/** Devuelve el usuario de la sesión actual o `null` si no está autenticado. */
export async function GET() { return NextResponse.json(await getCurrentUser()); }
