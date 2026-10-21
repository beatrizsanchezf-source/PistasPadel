import { describe, expect, it } from "vitest";
import { clubDateKey, clubDateTimeToUtc, clubDayBounds, clubTimeParts } from "@/lib/club-time";

describe("horario del club", () => {
  it("convierte una fecha y hora de Madrid a UTC", () => {
    const instant = clubDateTimeToUtc("2026-01-15", "16:00");

    expect(instant?.toISOString()).toBe("2026-01-15T15:00:00.000Z");
    expect(clubTimeParts(instant!)).toMatchObject({ year: 2026, month: 1, day: 15, hour: 16, minute: 0 });
  });

  it("calcula límites diarios correctos durante el horario de verano", () => {
    const bounds = clubDayBounds("2026-03-29");

    expect(bounds?.start.toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(bounds?.end.toISOString()).toBe("2026-03-29T22:00:00.000Z");
  });

  it("rechaza una hora inexistente durante el cambio al horario de verano", () => {
    expect(clubDateTimeToUtc("2026-03-29", "02:30")).toBeNull();
  });

  it("obtiene el día de Madrid aunque el navegador esté en otra zona", () => {
    expect(clubDateKey(new Date("2026-01-15T23:30:00.000Z"))).toBe("2026-01-16");
  });
});
