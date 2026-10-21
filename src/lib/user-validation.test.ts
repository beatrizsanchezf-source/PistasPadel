import { describe, expect, it } from "vitest";
import { validateUserInput } from "@/lib/user-validation";

describe("validación de usuarios", () => {
  const validUser = { name: "María García", email: "maria@example.test", phone: "600 123 456", password: "segura123", role: "CUSTOMER" };

  it("acepta datos válidos", () => {
    expect(validateUserInput(validUser, { passwordRequired: true })).toBeNull();
  });

  it.each([
    ["nombre demasiado corto", { name: "M" }],
    ["email inválido", { email: "maria@" }],
    ["teléfono inválido", { phone: "abc" }],
    ["rol inválido", { role: "OWNER" }],
    ["contraseña corta", { password: "123" }],
  ])("rechaza %s", (_description, change) => {
    expect(validateUserInput({ ...validUser, ...change }, { passwordRequired: true })).not.toBeNull();
  });

  it("permite conservar la contraseña al editar", () => {
    expect(validateUserInput({ ...validUser, password: "" }, { passwordRequired: false })).toBeNull();
  });
});
