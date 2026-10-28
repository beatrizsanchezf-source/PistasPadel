import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

const previousEnvironment = {
  redisUrl: process.env.UPSTASH_REDIS_REST_URL,
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  ipHeader: process.env.TRUSTED_CLIENT_IP_HEADER,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  for (const [key, value] of Object.entries({
    UPSTASH_REDIS_REST_URL: previousEnvironment.redisUrl,
    UPSTASH_REDIS_REST_TOKEN: previousEnvironment.redisToken,
    TRUSTED_CLIENT_IP_HEADER: previousEnvironment.ipHeader,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("proxy rate limits", () => {
  it("limita login con Redis y no expone la IP en la clave Redis", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://test-redis.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "unit-test-secret");
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "x-real-ip");
    let count = 0;
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const commands = JSON.parse(String(init?.body)) as Array<Array<string | number>>;
      const redisKey = String(commands[0][1]);
      expect(redisKey).not.toContain("203.0.113.44");
      count += 1;
      return Response.json([{ result: count }, { result: 1 }]);
    });
    vi.stubGlobal("fetch", fetchMock);

    let response: Response | undefined;
    for (let requestIndex = 0; requestIndex < 11; requestIndex += 1) {
      response = await proxy(new NextRequest("https://localhost/api/auth/login", {
        headers: { "x-real-ip": "203.0.113.44" },
      }));
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(fetchMock).toHaveBeenCalledTimes(11);
  });

  it("falla cerrado en producción si Redis no está configurado", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const response = await proxy(new NextRequest("https://localhost/api/auth/password-reset", {
      headers: { "x-real-ip": "203.0.113.45" },
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "El límite de seguridad compartido no está configurado." });
  });
});
