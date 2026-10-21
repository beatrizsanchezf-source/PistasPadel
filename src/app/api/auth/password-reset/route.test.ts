import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { findUserMock, findRecentTokenMock, deleteTokensMock, createTokenMock, sendEmailMock } = vi.hoisted(() => ({
  findUserMock: vi.fn(),
  findRecentTokenMock: vi.fn(),
  deleteTokensMock: vi.fn(),
  createTokenMock: vi.fn(),
  sendEmailMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: findUserMock },
    passwordResetToken: {
      findFirst: findRecentTokenMock,
      deleteMany: deleteTokensMock,
      create: createTokenMock,
    },
  },
}));
vi.mock("@/lib/password-reset-email", () => ({
  getMissingPasswordResetEmailConfig: () => [],
  sendPasswordResetEmail: sendEmailMock,
}));

import { POST } from "./route";

const originalEnvironment = {
  APP_URL: process.env.APP_URL,
};

function makeRequest(email: string) {
  return new NextRequest("http://localhost/api/auth/password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.APP_URL = "https://example.test";
  findRecentTokenMock.mockResolvedValue(null);
  deleteTokensMock.mockResolvedValue({ count: 0 });
  createTokenMock.mockResolvedValue({});
  sendEmailMock.mockResolvedValue(undefined);
});

afterEach(() => {
  if (originalEnvironment.APP_URL === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = originalEnvironment.APP_URL;
});

describe("POST /api/auth/password-reset", () => {
  it("responde igual cuando el correo no pertenece a una cuenta", async () => {
    findUserMock.mockResolvedValue(null);

    const response = await POST(makeRequest("missing@example.test"));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ message: expect.stringContaining("Si el correo está asociado") });
    expect(createTokenMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("guarda solo el hash del token y envía el enlace al correo registrado", async () => {
    findUserMock.mockResolvedValue({ id: "user-1", email: "person@example.test" });

    const response = await POST(makeRequest("PERSON@example.test"));

    expect(response.status).toBe(202);
    expect(createTokenMock).toHaveBeenCalledOnce();
    const storedToken = createTokenMock.mock.calls[0][0].data;
    expect(storedToken.userId).toBe("user-1");
    expect(storedToken.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedToken).not.toHaveProperty("token");
    expect(sendEmailMock).toHaveBeenCalledOnce();
    expect(sendEmailMock.mock.calls[0][0]).toBe("person@example.test");
    expect(sendEmailMock.mock.calls[0][1]).toContain("resetToken=");
  });
});
