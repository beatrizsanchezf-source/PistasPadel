import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseUpstashRestUrl } from "@/lib/upstash-url";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json({ status: "error", database: "unavailable" }, { status: 503 });
  }

  if (process.env.NODE_ENV !== "production") return NextResponse.json({ status: "ok", database: "ok" });

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return NextResponse.json({ status: "error", database: "ok", redis: "unconfigured" }, { status: 503 });
  const redisOrigin = parseUpstashRestUrl(redisUrl);
  if (!redisOrigin) return NextResponse.json({ status: "error", database: "ok", redis: "misconfigured" }, { status: 503 });

  try {
    const healthUrl = new URL("/ping", redisOrigin).toString();
    const response = await fetch(healthUrl, {
      headers: { Authorization: `Bearer ${redisToken}` },
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) throw new Error("Redis health request failed");
    return NextResponse.json({ status: "ok", database: "ok", redis: "ok" });
  } catch {
    return NextResponse.json({ status: "error", database: "ok", redis: "unavailable" }, { status: 503 });
  }
}
