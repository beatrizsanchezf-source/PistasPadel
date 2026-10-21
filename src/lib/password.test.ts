import { hash as bcryptHash } from "bcryptjs";
import { describe, expect, test } from "vitest";
import { hashLegacyPassword, hashPassword, isPbkdf2Hash, verifyPassword } from "@/lib/password";

describe("hash de contraseñas", () => {
  test("genera hashes PBKDF2 y verifica la contraseña", async () => {
    const stored = await hashPassword("secreto-seguro");

    expect(isPbkdf2Hash(stored)).toBe(true);
    expect(stored).toMatch(/^\$pbkdf2-sha256\$600000\$/);
    await expect(verifyPassword("secreto-seguro", stored)).resolves.toBe(true);
    await expect(verifyPassword("otra-clave", stored)).resolves.toBe(false);
  });

  test("permite verificar hashes scrypt antiguos durante la migración", async () => {
    const legacyHash = await hashLegacyPassword("clave-antigua");

    expect(isPbkdf2Hash(legacyHash)).toBe(false);
    await expect(verifyPassword("clave-antigua", legacyHash)).resolves.toBe(true);
    await expect(verifyPassword("incorrecta", legacyHash)).resolves.toBe(false);
  });

  test("permite verificar hashes bcrypt existentes durante la migración", async () => {
    const legacyHash = await bcryptHash("clave-bcrypt", 4);

    expect(isPbkdf2Hash(legacyHash)).toBe(false);
    await expect(verifyPassword("clave-bcrypt", legacyHash)).resolves.toBe(true);
    await expect(verifyPassword("incorrecta", legacyHash)).resolves.toBe(false);
  });

  test("rechaza hashes desconocidos o malformados", async () => {
    await expect(verifyPassword("clave", "no-es-un-hash")).resolves.toBe(false);
  });
});
