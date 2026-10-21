# Base de datos

## Tecnología

- Motor: PostgreSQL.
- ORM: Prisma 7.
- Adaptador: `@prisma/adapter-pg`.
- Configuración: `DATABASE_URL` en `.env`.

## Modelos

### `User`

Identidad y permisos de una persona. `email` es único. `role` puede ser `ADMIN` o `CUSTOMER`. `passwordHash` puede ser nulo para cuentas heredadas que todavía no tengan contraseña configurada.

### `Session`

Sesión autenticada con token almacenado como hash, usuario asociado y fecha de caducidad.

### `LoginAttempt`

Contador de intentos fallidos por correo, con ventana de reinicio y fecha de actualización.

### `Court`

Pista deportiva con nombre único, descripción y estado de iluminación.

### `Reservation`

Reserva vinculada a una pista y un usuario. Contiene intervalo temporal, jugadores, luz solicitada, estado y observaciones.

Estados de reserva:

- `PENDING`: pendiente.
- `CONFIRMED`: confirmada.
- `CANCELLED`: cancelada y excluida de conflictos.
- `NO_SHOW`: no presentada.

## Integridad

- Las relaciones eliminan sesiones y reservas dependientes mediante `onDelete: Cascade`.
- Hay índices para búsquedas por pista/fecha y usuario/fecha.
- PostgreSQL impide reservas activas solapadas en la misma pista mediante una restricción `EXCLUDE`.
- La migración añade una comprobación de que `endsAt` sea posterior a `startsAt`.

## Migraciones

Las migraciones versionadas están en `prisma/migrations`.

Desarrollo:

```powershell
npm run db:migrate -- --name descripcion-del-cambio
```

Despliegue:

```powershell
npm run db:deploy
```

Tras cambiar el esquema:

```powershell
npm run db:generate
```

No edites `src/generated/prisma` manualmente.

## Semilla

`prisma/seed.ts` solo funciona cuando `NODE_ENV` no es `production`. Necesita:

```dotenv
ADMIN_EMAIL="admin@example.test"
ADMIN_PASSWORD="una-contrasena-de-al-menos-12-caracteres"
```

Crea o actualiza tres pistas, un administrador y tres clientes de demostración, además de reservas de ejemplo.

## Copias y producción

Antes de aplicar migraciones en producción, realiza una copia de PostgreSQL y revisa la migración generada. Usa `db:deploy`, no `db:migrate`, en el entorno desplegado.
