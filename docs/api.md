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

Respuestas: `200` usuario, `400` entrada inválida, `401` credenciales incorrectas y `429` si se superan 5 fallos para ese email en 15 minutos. El proxy aplica además un máximo de 10 peticiones de login por IP cada 60 segundos.

### `GET /api/auth/me`

Devuelve el usuario autenticado o `null` si no hay sesión.

### `POST /api/auth/logout`

Elimina la sesión actual. Devuelve `{ "ok": true }`.

### `GET /api/health`

Comprueba conectividad de PostgreSQL y, en producción, también de Upstash Redis. Devuelve `200` si las dependencias necesarias responden y `503` si alguna está indisponible, sin exponer errores internos.

### `POST /api/auth/password-reset`

Solicita un correo para restablecer la contraseña. Responde `202` con el mismo mensaje haya cuenta o no, para evitar enumeración. Requiere `APP_URL`, `RESEND_API_KEY` y `MAIL_FROM` autorizado por Resend. El token dura 30 minutos; se limita a una solicitud por cuenta cada 60 segundos y a 5 peticiones por IP cada 60 segundos.

```json
{ "email": "persona@example.test" }
```

### `POST /api/auth/password-reset/confirm`

Consume el token de un solo uso, cambia la contraseña y revoca todas las sesiones de la cuenta.

```json
{ "token": "token-recibido-por-correo", "password": "una-nueva-clave-segura" }
```

La contraseña debe tener entre 12 y 128 caracteres. El token debe tener el formato emitido por la aplicación; los tokens caducados, inválidos o usados se rechazan con `400`.

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

La hora debe ser futura, estar en punto y pertenecer al horario de 08:00 a 21:00 (`Europe/Madrid`). El cliente solo puede reservar para su propio usuario y no puede fijar el estado; su reserva queda `PENDING`. El administrador puede elegir usuario y estado `PENDING`/`CONFIRMED`. Se rechazan solapamientos activos con `409`.

### `PATCH /api/reservations/:reservationId`

Requiere rol `ADMIN`. Para reservas futuras permite modificar pista, usuario, hora, jugadores, luz y estado (`PENDING`, `CONFIRMED`, `CANCELLED`); las observaciones se limitan a 500 caracteres. Una vez iniciada la reserva solo permite cambiar estado (`CONFIRMED`, `CANCELLED`, `NO_SHOW`) y observaciones. Devuelve `409` ante solapamiento.

Estados válidos: `PENDING`, `CONFIRMED`, `CANCELLED`, `NO_SHOW`.

## Usuarios

### `GET /api/users`

Requiere rol `ADMIN`. Devuelve usuarios sin `passwordHash`.

### `POST /api/users`

Requiere rol `ADMIN`. La contraseña debe tener entre 8 y 128 caracteres; el endpoint de restablecimiento exige al menos 12.

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

### `GET /api/users/first`

Endpoint de bootstrap retirado. Siempre responde `410 Gone`; el alta inicial se hace únicamente mediante la semilla de desarrollo protegida contra `NODE_ENV=production`.

## Límite general de API

El proxy limita por IP en ventanas fijas: rutas API generales a `60/60 s`, login a `10/60 s` y solicitud/confirmación de recuperación a `5/60 s` combinadas. Además, login limita a 5 fallos por email cada 15 minutos, y la solicitud de recuperación a una por cuenta cada 60 segundos. Las respuestas `429` incluyen `Retry-After` y `X-RateLimit-*`.

En desarrollo el contador del proxy se guarda en memoria del proceso. En producción todas las rutas API requieren Upstash Redis REST compartido; si Redis falta o falla, responden `503`. La IP se obtiene de `TRUSTED_CLIENT_IP_HEADER` (por defecto `x-real-ip`), que el balanceador debe sobrescribir con la IP del cliente.

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
