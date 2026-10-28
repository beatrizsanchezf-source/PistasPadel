import { NextResponse } from "next/server";

const maxJsonBodyBytes = 64 * 1024;

/** Lee JSON con tipo de contenido y límite de tamaño; nunca propaga el contenido recibido. */
export async function readJson<T>(request: Request): Promise<T | null> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json" || !request.body) return null;

  const contentLength = request.headers.get("content-length");
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > maxJsonBodyBytes)) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxJsonBodyBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as T;
  } catch {
    return null;
  }
}

/** Crea una respuesta JSON de error con el estado HTTP indicado. */
export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Comprueba que un valor sea un objeto JSON no nulo y no un array. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Request bodies are intentionally never included in application logs.