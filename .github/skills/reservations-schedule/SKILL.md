---
name: reservations-schedule
description: 'Use when changing reservation creation, editing, cancellation, schedule visibility, court availability, lighting, time zones, or concurrent booking rules.'
---

# Reservas y agenda

## Cuándo usarla

- Cambios en endpoints, reglas de dominio o UI de reservas y agenda.
- Disponibilidad de pistas, estados, observaciones, luces o concurrencia.
- Cambios de privacidad en los datos que ve cada rol.

## Procedimiento

1. Localiza la regla en `src/lib/reservation-use-cases.ts`; las rutas deben limitarse a HTTP y autorización.
2. Conserva la validación de horarios del club y las conversiones de `src/lib/club-time.ts` (`Europe/Madrid`).
3. Comprueba conflictos tanto en la lógica de aplicación como en las restricciones PostgreSQL pertinentes; no dependas de una comprobación previa susceptible a carreras.
4. Los clientes solo crean reservas propias y no pueden fijar su estado; las reservas nuevas quedan `PENDING`. Los administradores pueden indicar usuario y estado permitido por el flujo.
5. En la agenda del cliente, conserva la anonimización de reservas ajenas, incluyendo la omisión de sus identificadores.
6. Añade pruebas unitarias para reglas y de integración PostgreSQL para cambios de concurrencia/integridad.
7. Actualiza `docs/api.md`, `docs/architecture.md` y `docs/user-manual.md` según la superficie modificada.

## Estados

- Estados: `PENDING`, `CONFIRMED`, `CANCELLED`, `NO_SHOW`.
- Las reservas canceladas no deben bloquear una pista.
- Las observaciones de reserva se limitan a 500 caracteres y no deben aceptar controles/bidi no permitidos.

## UI

- El formulario separa fecha y hora; la composición convierte la hora del club a UTC.
- Mantén la carga/refetch de agenda en `src/app/hooks/use-schedule.ts` y el renderizado en los componentes existentes.