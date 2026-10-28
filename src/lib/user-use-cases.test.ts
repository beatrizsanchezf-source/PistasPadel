import { describe, expect, it, vi } from "vitest";
import { updateUser } from "@/lib/user-use-cases";

describe("updateUser", () => {
  it("impide degradar al último administrador", async () => {
    const transaction = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ role: "ADMIN" }),
        count: vi.fn().mockResolvedValue(1),
        update: vi.fn(),
      },
      session: { deleteMany: vi.fn() },
    };
    const database = { $transaction: vi.fn((operation: (tx: typeof transaction) => unknown) => operation(transaction)) } as never;

    const result = await updateUser("admin-1", { name: "Cliente", email: "cliente@example.test", phone: null, role: "CUSTOMER" }, database);

    expect(result).toEqual({ kind: "last_admin" });
    expect(transaction.user.update).not.toHaveBeenCalled();
  });

  it("revoca sesiones al cambiar la contraseña", async () => {
    const transaction = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ role: "CUSTOMER" }),
        count: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: "customer-1", role: "CUSTOMER" }),
      },
      session: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    };
    const database = { $transaction: vi.fn((operation: (tx: typeof transaction) => unknown) => operation(transaction)) } as never;

    const result = await updateUser("customer-1", { name: "Cliente", email: "cliente@example.test", phone: null, role: "CUSTOMER", password: "nueva-clave-segura" }, database);

    expect(result.kind).toBe("saved");
    expect(transaction.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ passwordHash: expect.stringMatching(/^\$pbkdf2-sha256\$/) }) }));
    expect(transaction.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "customer-1" } });
  });
});
