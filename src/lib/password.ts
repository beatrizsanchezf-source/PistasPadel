import { pbkdf2 as pbkdf2Callback, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { compare } from "bcryptjs";
import { promisify } from "node:util";

const pbkdf2Iterations = 600_000;
const pbkdf2KeyLength = 32;
const pbkdf2SaltLength = 16;
const pbkdf2 = promisify(pbkdf2Callback);
const scrypt = promisify(scryptCallback) as (password: string, salt: string, keyLength: number) => Promise<Buffer>;

/** Genera un hash PBKDF2-HMAC-SHA-256 con sal aleatoria para contraseñas nuevas. */
export async function hashPassword(password: string) {
  const salt = randomBytes(pbkdf2SaltLength);
  const derivedKey = await pbkdf2(password, salt, pbkdf2Iterations, pbkdf2KeyLength, "sha256");
  return `$pbkdf2-sha256$${pbkdf2Iterations}$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

/** Identifica hashes PBKDF2 para decidir si una cuenta antigua debe migrarse. */
export function isPbkdf2Hash(stored: string) {
  return stored.startsWith("$pbkdf2-sha256$");
}

/**
 * Verifica PBKDF2 y los formatos bcrypt y `salt:hash` de scrypt heredados.
 * @returns `false` para formatos desconocidos o credenciales incorrectas.
 */
export async function verifyPassword(password: string, stored: string) {
  if (isPbkdf2Hash(stored)) {
    const [, algorithm, iterationsValue, saltValue, hashValue] = stored.split("$");
    const iterations = Number(iterationsValue);
    if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100_000 || iterations > 2_000_000 || !saltValue || !hashValue) return false;
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(hashValue, "base64url");
    if (salt.length !== pbkdf2SaltLength || expected.length !== pbkdf2KeyLength) return false;
    const candidate = await pbkdf2(password, salt, iterations, expected.length, "sha256");
    return timingSafeEqual(expected, candidate);
  }

  if (/^\$2[aby]\$\d{2}\$/.test(stored)) return compare(password, stored);

  const [salt, hashValue] = stored.split(":");
  if (!salt || !hashValue || !/^[a-f\d]{128}$/i.test(hashValue)) return false;
  const candidate = await scrypt(password, salt, 64);
  return timingSafeEqual(Buffer.from(hashValue, "hex"), candidate);
}

/** Genera un hash scrypt heredado para mantener y probar la migración de cuentas antiguas. */
export async function hashLegacyPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await scrypt(password, salt, 64)).toString("hex")}`;
}
