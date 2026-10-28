import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminMock, findManyMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findMany: findManyMock } } }));

import { GET } from "./route";

beforeEach(() => vi.clearAllMocks());

describe("GET /api/users", () => {
  it("deniega clientes antes de consultar usuarios", async () => {
    requireAdminMock.mockRejectedValue(new Error("FORBIDDEN"));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("solo selecciona campos públicos para administradores", async () => {
    requireAdminMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    findManyMock.mockResolvedValue([{ id: "user-1", name: "Cliente", email: "cliente@example.test", phone: null, role: "CUSTOMER" }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({
      select: { id: true, name: true, email: true, phone: true, role: true },
    }));
    expect(JSON.stringify(await response.json())).not.toContain("passwordHash");
  });
});
