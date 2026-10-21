import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getCurrentUserMock, findManyMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { court: { findMany: findManyMock } } }));

import { GET } from "./route";

const courts = [{
  id: 1,
  name: "Pista 1",
  description: "Cubierta",
  lightsOn: false,
  reservations: [
    { id: "own-reservation", startsAt: new Date("2026-10-20T15:00:00.000Z"), players: 4, withLight: true, status: "CONFIRMED", user: { id: "customer-1", name: "María" } },
    { id: "other-reservation", startsAt: new Date("2026-10-20T16:00:00.000Z"), players: 2, withLight: true, status: "PENDING", user: { id: "customer-2", name: "Otra persona" } },
  ],
}];

beforeEach(() => {
  vi.clearAllMocks();
  findManyMock.mockResolvedValue(courts);
});

describe("GET /api/schedule", () => {
  it("oculta el identificador y los datos personales de reservas ajenas a clientes", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "customer-1", role: "CUSTOMER" });

    const response = await GET(new NextRequest("http://localhost/api/schedule?date=2026-10-20"));
    const body = await response.json();

    expect(body[0].reservations[0]).toMatchObject({ id: "own-reservation", user: { name: "María" } });
    expect(body[0].reservations[1]).not.toHaveProperty("id");
    expect(body[0].reservations[1].user.name).toBe("Reservada");
  });

  it("mantiene los identificadores completos para administradores", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const response = await GET(new NextRequest("http://localhost/api/schedule?date=2026-10-20"));
    const body = await response.json();

    expect(body[0].reservations.map((reservation: { id: string }) => reservation.id)).toEqual(["own-reservation", "other-reservation"]);
  });
});