/** Roles que pueden asignarse a cuentas de usuario. */
export const userRoles = ["ADMIN", "CUSTOMER"] as const;
/** Unión de roles admitidos por la aplicación. */
export type UserRoleValue = (typeof userRoles)[number];

/** Datos sin confiar recibidos de un formulario o petición HTTP. */
export type UserInput = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  password?: unknown;
  role?: unknown;
};

const localEmailPattern = /^[^\s@]+$/;
const domainLabelPattern = /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i;
const phonePattern = /^[+\d][\d\s().-]{6,19}$/;
const unsafeTextPattern = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/;

export function containsUnsafeText(value: string) {
  return unsafeTextPattern.test(value);
}

export function normalizeEmail(email: string) {
  return email.normalize("NFC").trim().toLowerCase();
}

export function isValidEmail(value: string) {
  if (value.length > 254 || containsUnsafeText(value)) return false;
  const parts = normalizeEmail(value).split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  const labels = domain.split(".");
  return local.length > 0 && local.length <= 64 && localEmailPattern.test(local) && labels.length >= 2 && labels.every((label) => domainLabelPattern.test(label));
}

/**
 * Devuelve el primer error de validación de usuario, o `null` si los datos son válidos.
 * @param input Datos sin confiar que se van a validar.
 * @param options Indica si la operación requiere una contraseña no vacía.
 */
export function validateUserInput(input: UserInput, options: { passwordRequired: boolean }): string | null {
  if (typeof input.name !== "string" || input.name.normalize("NFC").trim().length < 2 || input.name.normalize("NFC").trim().length > 100 || containsUnsafeText(input.name)) return "El nombre debe tener entre 2 y 100 caracteres y no incluir caracteres de control.";
  if (typeof input.email !== "string" || input.email.trim().length > 254 || !isValidEmail(input.email)) return "Introduce un correo electrónico válido.";
  if (input.phone !== undefined && input.phone !== null && typeof input.phone !== "string") return "El teléfono no es válido.";
  if (typeof input.phone === "string" && input.phone.trim() && !phonePattern.test(input.phone.trim())) return "Introduce un teléfono válido.";
  if (!userRoles.includes(input.role as UserRoleValue)) return "Selecciona un rol válido.";
  if (options.passwordRequired && (typeof input.password !== "string" || input.password.length === 0)) return "La contraseña es obligatoria.";
  if (input.password !== undefined && typeof input.password !== "string") return "La contraseña no es válida.";
  if (typeof input.password === "string" && (containsUnsafeText(input.password) || (input.password && (input.password.length < 8 || input.password.length > 128)))) return "La contraseña debe tener entre 8 y 128 caracteres válidos.";
  return null;
}

/** Normaliza los campos validados antes de persistirlos. */
export function normalizeUserInput(input: UserInput) {
  return {
    name: (input.name as string).normalize("NFC").trim(),
    email: normalizeEmail(input.email as string),
    phone: typeof input.phone === "string" ? input.phone.normalize("NFC").trim() || null : null,
    role: input.role as UserRoleValue,
  };
}
