import type { ReservationStatus } from "@/generated/prisma/client";

/** Forma común de los cuerpos de error devueltos por la API. */
type ApiError = { error?: string };

/** Representación pública de usuario que nunca incluye el hash de contraseña. */
export type ClientUser = { id: string; name: string; email: string; phone?: string | null; role: "ADMIN" | "CUSTOMER" };
/** Reserva tal como la consume la agenda del navegador. */
export type ScheduleReservation = { id?: string; startsAt: string; players: number; withLight: boolean; status: ReservationStatus; notes?: string | null; user: { id?: string; name: string } };
/** Pista junto con las reservas visibles para el usuario actual. */
export type ScheduleCourt = { id: number; name: string; description: string; lightsOn: boolean; reservations: ScheduleReservation[] };

/** Ejecuta una petición JSON, traduce errores API a excepciones y devuelve su cuerpo tipado. */
async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null) as T | ApiError | null;
  if (!response.ok) throw new Error(body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "No se pudo completar la solicitud.");
  return body as T;
}

/** Construye opciones `fetch` para enviar un cuerpo JSON. */
const jsonInit = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Operaciones HTTP del cliente agrupadas por área funcional. */
export const api = {
  auth: {
    currentUser: () => requestJson<ClientUser | null>("/api/auth/me"),
    login: (credentials: { email: string; password: string }) => requestJson<ClientUser>("/api/auth/login", jsonInit("POST", credentials)),
    requestPasswordReset: (email: string) => requestJson<{ message: string }>("/api/auth/password-reset", jsonInit("POST", { email })),
    confirmPasswordReset: (input: { token: string; password: string }) => requestJson<{ message: string }>("/api/auth/password-reset/confirm", jsonInit("POST", input)),
    logout: () => requestJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  },
  courts: {
    schedule: (date: string) => requestJson<ScheduleCourt[]>(`/api/schedule?date=${date}`),
    setLights: (courtId: number, lightsOn: boolean) => requestJson<ScheduleCourt>(`/api/courts/${courtId}/lights`, jsonInit("PATCH", { lightsOn })),
  },
  users: {
    list: () => requestJson<ClientUser[]>("/api/users"),
    create: (input: unknown) => requestJson<ClientUser>("/api/users", jsonInit("POST", input)),
    update: (userId: string, input: unknown) => requestJson<ClientUser>(`/api/users/${userId}`, jsonInit("PATCH", input)),
  },
  reservations: {
    create: (input: unknown) => requestJson<ScheduleReservation>("/api/reservations", jsonInit("POST", input)),
    update: (reservationId: string, input: unknown) => requestJson<ScheduleReservation>(`/api/reservations/${reservationId}`, jsonInit("PATCH", input)),
  },
};
