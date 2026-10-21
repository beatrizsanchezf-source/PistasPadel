import { NextResponse } from "next/server";

/** Lee un cuerpo JSON y devuelve `null` cuando el cuerpo está vacío o mal formado. */
export async function readJson<T>(request: Request): Promise<T | null> {
  return request.json().catch(() => null) as Promise<T | null>;
}

/** Crea una respuesta JSON de error con el estado HTTP indicado. */
export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Comprueba que un valor sea un objeto JSON no nulo y no un array. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
