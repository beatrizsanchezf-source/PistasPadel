import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { transactionMock, findTokenMock, consumeTokenMock, updateUserMock, deleteSessionsMock } = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  findTokenMock: vi.fn(),
  consumeTokenMock: vi.fn(),
  updateUserMock: vi.fn(),
  deleteSessionsMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
  },
}));

import { POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
    passwordResetToken: { findUnique: findTokenMock, deleteMany: consumeTokenMock },
    user: { update: updateUserMock },
    session: { deleteMany: deleteSessionsMock },
  }));
  findTokenMock.mockResolvedValue({ userId: "user-1" });
  consumeTokenMock.mockResolvedValue({ count: 1 });
  updateUserMock.mockResolvedValue({});
  deleteSessionsMock.mockResolvedValue({ count: 2 });
});

describe("POST /api/auth/password-reset/confirm", () => {
  it("rechaza contraseñas que no alcanzan la longitud mínima", async () => {
    const request = new NextRequest("http://localhost/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "reset-token", password: "corta" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("cambia la contraseña y revoca las sesiones existentes", async () => {
    const request = new NextRequest("http://localhost/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "A".repeat(43), password: "una-clave-nueva-segura" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ message: "La contraseña se ha cambiado. Ya puedes iniciar sesión." });
    expect(consumeTokenMock).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ expiresAt: { gt: expect.any(Date) } }) }));
    expect(updateUserMock).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user-1" }, data: { passwordHash: expect.stringMatching(/^\$pbkdf2-sha256\$/) } }));
    expect(deleteSessionsMock).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("rechaza un token inexistente o ya utilizado", async () => {
    findTokenMock.mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "B".repeat(43), password: "una-clave-nueva-segura" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "El enlace ha caducado o ya se ha utilizado. Solicita uno nuevo." });
    expect(updateUserMock).not.toHaveBeenCalled();
  });
});