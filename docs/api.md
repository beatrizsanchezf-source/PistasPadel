# API

Todas las rutas devuelven JSON. Las respuestas de error tienen la forma `{ "error": "mensaje" }`.

## Autenticación

### `POST /api/auth/login`

Inicia sesión y establece la cookie `pistas_padel_session`.

```json
{
  "email": "admin@example.test",
  "password": "una-contrasena-larga-y-unica"
}
```

Respuestas: `200` usuario, `400` entrada inválida, `401` credenciales incorrectas, `429` demasiados intentos.

### `GET /api/auth/me`

Devuelve el usuario autenticado o `null` si no hay sesión.

### `POST /api/auth/logout`

Elimina la sesión actual. Devuelve `{ "ok": true }`.

### `POST /api/auth/password-reset`

Solicita un correo para restablecer la contraseña. Siempre devuelve el mismo mensaje para no revelar si el correo está registrado. Requiere `APP_URL`, `RESEND_API_KEY` y `MAIL_FROM`; los enlaces duran 30 minutos y solo se puede solicitar uno por cuenta cada minuto.

```json
{ "email": "persona@example.test" }
```

### `POST /api/auth/password-reset/confirm`

Consume el token de un solo uso, cambia la contraseña y revoca todas las sesiones de la cuenta.

```json
{ "token": "token-recibido-por-correo", "password": "una-nueva-clave-segura" }
```

La contraseña debe tener entre 12 y 128 caracteres. Los tokens caducados o usados se rechazan.

## Agenda y pistas

### `GET /api/schedule?date=AAAA-MM-DD`

Requiere sesión. Devuelve pistas y reservas del día. Los administradores reciben los detalles completos; los clientes ven sus propias reservas y una representación anonimizada de las reservas de terceros, sin sus identificadores.

### `PATCH /api/courts/:courtId/lights`

Requiere rol `ADMIN`.

```json
{ "lightsOn": true }
```

Devuelve la pista actualizada. `400` indica datos inválidos, `403` falta de permisos y `404` pista inexistente.

## Reservas

### `POST /api/reservations`

Requiere sesión. Los clientes solo pueden crear reservas para sí mismos; un administrador puede indicar `userId` y `status`.

```json
{
  "courtId": 1,
  "userId": "id-opcional-para-admin",
  "startsAt": "2026-10-01T15:00:00.000Z",
  "players": 4,
  "withLight": true,
  "status": "PENDING"
}
```

La hora debe ser futura, estar en punto y pertenecer al horario de 08:00 a 21:00. Se rechazan solapamientos activos.

### `PATCH /api/reservations/:reservationId`

Requiere rol `ADMIN`. Permite modificar pista, usuario, hora, jugadores, luz, estado y observaciones. Después de la hora de inicio solo se permite modificar estado y observaciones.

Estados válidos: `PENDING`, `CONFIRMED`, `CANCELLED`, `NO_SHOW`.

## Usuarios

### `GET /api/users`

Requiere rol `ADMIN`. Devuelve usuarios sin `passwordHash`.

### `POST /api/users`

Requiere rol `ADMIN`.

```json
{
  "name": "María García",
  "email": "maria@example.test",
  "phone": "600000000",
  "password": "contraseña-segura",
  "role": "CUSTOMER"
}
```

### `PATCH /api/users/:userId`

Requiere rol `ADMIN`. Actualiza datos, rol y opcionalmente contraseña. No permite convertir al único administrador en cliente.

### `POST /api/users/first`

Endpoint auxiliar para el alta inicial según las reglas definidas por la aplicación. Debe mantenerse protegido y revisarse antes de exponerlo públicamente.

## Códigos comunes

| Código | Significado |
| --- | --- |
| `200` | Operación correcta. |
| `201` | Recurso creado. |
| `400` | Datos inválidos. |
| `401` | Falta autenticación. |
| `403` | Sin permisos. |
| `404` | Recurso inexistente. |
| `409` | Conflicto, normalmente correo o reserva duplicada. |
| `429` | Límite de intentos superado. |
| `500` | Error inesperado del servidor. |
