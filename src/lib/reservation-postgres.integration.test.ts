import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";
import { createReservation } from "@/lib/reservation-use-cases";
import { hashPassword } from "@/lib/password";
import type { SessionUser } from "@/lib/auth";
import { describe, expect, it } from "vitest";

describe("reservation integration on PostgreSQL", () => {
  it("rejects concurrent overlapping bookings at the PostgreSQL constraint", async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for PostgreSQL integration tests.");

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const database = new PrismaClient({ adapter: new PrismaPg(pool) });
    const testSuffix = randomUUID();
    const userId = `integration-${testSuffix}`;
    let courtId: number | undefined;

    try {
      const user = await database.user.create({
        data: {
          id: userId,
          name: "Integration Admin",
          email: `integration-${testSuffix}@example.test`,
          passwordHash: await hashPassword(randomUUID()),
          role: "ADMIN",
        },
      });
      const lastCourt = await database.court.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
      const proposedCourtId = (lastCourt?.id ?? 0) + 1000;
      const court = await database.court.create({
        data: { id: proposedCourtId, name: `Integration ${testSuffix}`, description: "Temporary integration court" },
      });
      courtId = court.id;
      const admin: SessionUser = { id: user.id, name: user.name, email: user.email, role: "ADMIN" };
      const input = { courtId: court.id, userId: user.id, startsAt: "2035-01-15T10:00:00.000Z", players: 4, withLight: false, status: "CONFIRMED" };

      const results = await Promise.all([
        createReservation(input, admin, database),
        createReservation(input, admin, database),
      ]);

      expect(results.map((result) => result.kind).sort()).toEqual(["conflict", "created"]);
      const activeBookings = await database.reservation.count({ where: { courtId: court.id, status: { not: "CANCELLED" } } });
      expect(activeBookings).toBe(1);
    } finally {
      if (courtId !== undefined) await database.court.deleteMany({ where: { id: courtId } });
      await database.user.deleteMany({ where: { id: userId } });
      await database.$disconnect();
    }
  });
});
