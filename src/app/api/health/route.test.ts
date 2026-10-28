import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: queryMock } }));

import { GET } from "./route";

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("GET /api/health", () => {
  it("devuelve saludable cuando PostgreSQL responde", async () => {
    queryMock.mockResolvedValue([{ "?column?": 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", database: "ok" });
  });

  it("devuelve 503 sin detalles internos si PostgreSQL falla", async () => {
    queryMock.mockRejectedValue(new Error("internal connection details"));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "error", database: "unavailable" });
  });

  it("comprueba Redis en producción sin exponer credenciales", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://test-redis.upstash.io/");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "health-test-secret");
    queryMock.mockResolvedValue([{ "?column?": 1 }]);
    const fetchMock = vi.fn().mockResolvedValue(new Response("PONG", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", database: "ok", redis: "ok" });
    expect(fetchMock).toHaveBeenCalledWith("https://test-redis.upstash.io/ping", expect.objectContaining({
      headers: { Authorization: "Bearer health-test-secret" },
    }));
  });

  it("falla cerrado en producción si Redis no está configurado", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    queryMock.mockResolvedValue([{ "?column?": 1 }]);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "error", database: "ok", redis: "unconfigured" });
  });
});
