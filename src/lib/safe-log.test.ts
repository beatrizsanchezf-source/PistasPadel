import { afterEach, describe, expect, it, vi } from "vitest";
import { logSanitizedError } from "@/lib/safe-log";

afterEach(() => vi.restoreAllMocks());

describe("logSanitizedError", () => {
  it("registra el código estable sin la excepción ni su mensaje", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logSanitizedError("database request failed", Object.assign(new Error("email=user@example.test password=hunter2"), { code: "P2002" }));

    expect(consoleError).toHaveBeenCalledWith("database request failed", { code: "P2002" });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("user@example.test");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("hunter2");
  });

  it("normaliza códigos que no cumplen la allow-list", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logSanitizedError("operation failed", { code: "email=user@example.test" });

    expect(consoleError).toHaveBeenCalledWith("operation failed", { code: "UNEXPECTED" });
  });
});
