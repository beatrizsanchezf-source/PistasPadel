import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";

/** Cierra la sesión actual y elimina su cookie de autenticación. */
export async function POST() { await deleteSession(); return NextResponse.json({ ok: true }); }
