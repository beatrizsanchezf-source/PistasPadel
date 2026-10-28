/** Logs only stable error codes; exception messages may include SQL values or personal data. */
export function logSanitizedError(event: string, error: unknown) {
  const candidate = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : "UNEXPECTED";
  const code = /^[A-Z0-9_]{1,32}$/.test(candidate) ? candidate : "UNEXPECTED";
  console.error(event, { code });
}
