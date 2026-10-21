import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Contador y vencimiento de la ventana de rate limit de una IP. */
type RequestWindow = { count: number; resetAt: number };

const windowMs = 60_000;
const maxRequests = 60;
const windows = new Map<string, RequestWindow>();

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
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

/** Elimina contadores de rate limit cuya ventana ya ha vencido. */
function cleanupWindows(now: number) {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

/** Limita a 60 peticiones por minuto cada IP para las rutas API. */
export function proxy(request: NextRequest) {
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
  const current = windows.get(key);
  const window = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + windowMs };

  window.count += 1;
  windows.set(key, window);
  const remaining = Math.max(0, maxRequests - window.count);
  const headers = new Headers({
    "X-RateLimit-Limit": String(maxRequests),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(window.resetAt / 1000)),
  });
  responseHeaders.forEach((value, name) => headers.set(name, value));

  if (window.count > maxRequests) {
    headers.set("Retry-After", String(Math.ceil((window.resetAt - now) / 1000)));
    return NextResponse.json({ error: "Demasiadas peticiones. Inténtalo de nuevo en unos segundos." }, { status: 429, headers });
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  headers.forEach((value, name) => response.headers.set(name, value));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
