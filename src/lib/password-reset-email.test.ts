import { afterEach, describe, expect, it, vi } from "vitest";
import { getMissingPasswordResetEmailConfig, isPasswordResetEmailConfigured, sendPasswordResetEmail } from "@/lib/password-reset-email";

describe("configuración del correo de restablecimiento", () => {
  const previousValues = {
    APP_URL: process.env.APP_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MAIL_FROM: process.env.MAIL_FROM,
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const [key, value] of Object.entries(previousValues)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("indica las variables ausentes sin devolver sus valores", () => {
    delete process.env.APP_URL;
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;

    expect(getMissingPasswordResetEmailConfig()).toEqual(["APP_URL", "RESEND_API_KEY", "MAIL_FROM"]);
    expect(isPasswordResetEmailConfigured()).toBe(false);
  });

  it("acepta la configuración completa", () => {
    process.env.APP_URL = "https://localhost:3000";
    process.env.RESEND_API_KEY = "test-key";
    process.env.MAIL_FROM = "Pistas Pádel <no-reply@example.test>";

    expect(getMissingPasswordResetEmailConfig()).toEqual([]);
    expect(isPasswordResetEmailConfigured()).toBe(true);
  });

  it("incluye el motivo de rechazo de Resend sin incluir la clave API", async () => {
    process.env.RESEND_API_KEY = "secret-test-key";
    process.env.MAIL_FROM = "Pistas Pádel <no-reply@example.test>";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ name: "validation_error", message: "The sender domain is not verified." }),
    }));

    const error = await sendPasswordResetEmail("user@example.test", "https://example.test/reset").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Resend rejected request (403).");
    expect((error as Error).message).not.toContain("not verified");
    expect((error as Error).message).not.toContain("secret-test-key");
    const requestOptions = vi.mocked(fetch).mock.calls[0][1];
    expect(JSON.parse(String(requestOptions?.body)).from).toBe(process.env.MAIL_FROM);
  });
});
