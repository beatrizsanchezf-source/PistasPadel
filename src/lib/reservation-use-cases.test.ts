import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/auth";
import { createReservation, updateReservation } from "@/lib/reservation-use-cases";

const customer: SessionUser = { id: "customer-1", name: "Cliente", email: "cliente@example.test", role: "CUSTOMER" };
const validInput = { courtId: 1, userId: "attacker-selected-user", startsAt: "2035-01-15T10:00:00.000Z", players: 4, withLight: false, status: "CONFIRMED" };

function makeDatabase() {
  return {
    court: { findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
    user: { findUnique: vi.fn().mockResolvedValue({ id: customer.id }) },
    reservation: {
      findUnique: vi.fn().mockResolvedValue({ id: "reservation-1", startsAt: new Date("2035-01-15T10:00:00.000Z") }),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "reservation-1" }),
      update: vi.fn().mockResolvedValue({ id: "reservation-1" }),
    },
  } as unknown as PrismaClient & {
    court: { findUnique: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
    reservation: { findUnique: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  };
}

beforeEach(() => vi.clearAllMocks());

describe("createReservation", () => {
  it("impone el propietario y el estado pendiente para clientes", async () => {
    const database = makeDatabase();

    const result = await createReservation(validInput, customer, database);

    expect(result.kind).toBe("created");
    expect(database.reservation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: customer.id, status: "PENDING" }),
    }));
  });

  it("rechaza horarios fuera de las reglas antes de consultar la base", async () => {
    const database = makeDatabase();

    const result = await createReservation({ ...validInput, players: 5 }, customer, database);

    expect(result).toEqual({ kind: "invalid" });
    expect(database.court.findUnique).not.toHaveBeenCalled();
    expect(database.reservation.create).not.toHaveBeenCalled();
  });

  it("devuelve conflicto si ya existe una reserva solapada", async () => {
    const database = makeDatabase();
    database.reservation.findFirst.mockResolvedValue({ id: "existing-reservation" });

    const result = await createReservation(validInput, customer, database);

    expect(result).toEqual({ kind: "conflict" });
    expect(database.reservation.create).not.toHaveBeenCalled();
  });
});

describe("updateReservation", () => {
  it("permite editar una reserva pasada solo con estado y observaciones", async () => {
    const database = makeDatabase();
    database.reservation.findUnique.mockResolvedValue({ id: "reservation-1", startsAt: new Date("2020-01-15T10:00:00.000Z") });

    const result = await updateReservation("reservation-1", { status: "NO_SHOW", notes: "  No acudió  " }, database, new Date("2025-01-01T00:00:00.000Z"));

    expect(result.kind).toBe("updated");
    expect(database.reservation.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: "NO_SHOW", notes: "No acudió" },
    }));
  });

  it("rechaza una edición futura que ya se solapa antes de persistir", async () => {
    const database = makeDatabase();
    database.reservation.findFirst.mockResolvedValue({ id: "other-reservation" });

    const result = await updateReservation("reservation-1", validInput, database, new Date("2034-01-01T00:00:00.000Z"));

    expect(result.kind).toBe("conflict");
    expect(database.reservation.update).not.toHaveBeenCalled();
  });

  it("rechaza notas excesivas o con caracteres de control", async () => {
    const database = makeDatabase();
    const result = await updateReservation("reservation-1", {
      ...validInput,
      notes: `nota\u202e${"x".repeat(600)}`,
    }, database, new Date("2034-01-01T00:00:00.000Z"));

    expect(result).toEqual({ kind: "invalid" });
    expect(database.reservation.update).not.toHaveBeenCalled();
  });
});
