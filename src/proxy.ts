import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHmac, randomBytes } from "node:crypto";
import { parseUpstashRestUrl } from "@/lib/upstash-url";
import { logSanitizedError } from "@/lib/safe-log";

/** Contador y vencimiento de la ventana de rate limit de una IP. */
type RequestWindow = { count: number; resetAt: number };

const windowMs = 60_000;
const maxRequests = 60;
const windows = new Map<string, RequestWindow>();
const localIpHashKey = randomBytes(32);

function getRateLimit(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.endsWith("/auth/login")) return { limit: 10, key: "login" };
  if (pathname.endsWith("/auth/password-reset") || pathname.endsWith("/auth/password-reset/confirm")) return { limit: 5, key: "password-reset" };
  return { limit: maxRequests, key: "api" };
}

async function consumeRateLimit(key: string, now: number) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const redisOrigin = redisUrl ? parseUpstashRestUrl(redisUrl) : null;
  if (redisOrigin && redisToken) {
    const bucket = Math.floor(now / windowMs);
    const rateLimitKey = `pistas-padel:rate:${bucket}:${key}`;
    const response = await fetch(new URL("/pipeline", redisOrigin), {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", rateLimitKey],
        ["PEXPIRE", rateLimitKey, windowMs * 2, "NX"],
      ]),
    });
    if (!response.ok) throw new Error(`El almacén de rate limit respondió ${response.status}.`);
    const results = await response.json() as Array<{ result?: unknown; error?: unknown }>;
    if (results[0]?.error || results[1]?.error) throw new Error("El pipeline Redis devolvió un error de comando.");
    const count = Number(results[0]?.result);
    if (!Number.isInteger(count) || count < 1) throw new Error("Redis devolvió un contador de rate limit inválido.");
    const resetAt = (bucket + 1) * windowMs;
    return { count, resetAt };
  }

  const current = windows.get(key);
  const window = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };
  window.count += 1;
  windows.set(key, window);
  return window;
}

function createContentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "connect-src 'self'",
    "font-src 'self' data:",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/** Obtiene una clave de cliente a partir de las cabeceras del proxy de entrada. */
function getClientKey(request: NextRequest) {
  const trustedHeader = process.env.TRUSTED_CLIENT_IP_HEADER?.toLowerCase() || "x-real-ip";
  const rawAddress = request.headers.get(trustedHeader)?.trim() || "unknown";
  const key = process.env.UPSTASH_REDIS_REST_TOKEN || localIpHashKey;
  return createHmac("sha256", key).update(rawAddress).digest("hex");
}

/** Elimina contadores de rate limit cuya ventana ya ha vencido. */
function cleanupWindows(now: number) {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

/** Limita a 60 peticiones por minuto cada IP para las rutas API. */
export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const contentSecurityPolicy = createContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const responseHeaders = new Headers({
    "Content-Security-Policy": contentSecurityPolicy,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "X-DNS-Prefetch-Control": "off",
  });
  if (process.env.NODE_ENV === "production") responseHeaders.set("Strict-Transport-Security", "max-age=31536000");

  if (!request.nextUrl.pathname.startsWith("/api/")) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    responseHeaders.forEach((value, name) => response.headers.set(name, value));
    return response;
  }

  const now = Date.now();
  cleanupWindows(now);
  const key = getClientKey(request);
  const policy = getRateLimit(request);
  const sharedStoreConfigured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  if (process.env.NODE_ENV === "production" && !sharedStoreConfigured) {
    return NextResponse.json({ error: "El límite de seguridad compartido no está configurado." }, { status: 503, headers: responseHeaders });
  }
  let rateWindow: RequestWindow;
  try {
    rateWindow = await consumeRateLimit(`${policy.key}:${key}`, now);
  } catch (error) {
    logSanitizedError("No se pudo consultar el rate limit compartido.", error);
    return NextResponse.json({ error: "Servicio temporalmente no disponible." }, { status: 503, headers: responseHeaders });
  }
  const remaining = Math.max(0, policy.limit - rateWindow.count);
  const headers = new Headers({
    "X-RateLimit-Limit": String(policy.limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(rateWindow.resetAt / 1000)),
  });
  responseHeaders.forEach((value, name) => headers.set(name, value));

  if (rateWindow.count > policy.limit) {
    headers.set("Retry-After", String(Math.ceil((rateWindow.resetAt - now) / 1000)));
    return NextResponse.json({ error: "Demasiadas peticiones. Inténtalo de nuevo en unos segundos." }, { status: 429, headers });
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  headers.forEach((value, name) => response.headers.set(name, value));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
