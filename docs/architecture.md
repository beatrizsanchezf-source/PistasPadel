# Arquitectura

## Vista general

La aplicación usa Next.js App Router con React 19, TypeScript, Prisma 7 y PostgreSQL.

```text
src/app/page.tsx
    |
    +-- src/lib/client-api.ts       Cliente HTTP tipado del navegador
    |       |
    |       +-- src/app/api/**       Rutas de aplicación
    |                              |
    |                              +-- src/lib/auth.ts
    |                              +-- src/lib/http.ts
    |                              +-- src/lib/prisma.ts
    |                                      |
    |                                      +-- PostgreSQL
    |
    +-- src/lib/club-time.ts        Reglas de zona horaria del club
```

## Capas

### Presentación

`src/app/page.tsx` compone la sesión activa, selección de fecha y navegación principal. El acceso/recuperación, administración de clientes, formulario de reservas y board de agenda están separados en `src/app/components/`. El hook `src/app/hooks/use-schedule.ts` aísla carga, cancelación y refresco de agenda. Los componentes presentan datos y emiten acciones mediante props; no acceden directamente a Prisma ni contienen reglas de autorización.

### API

Las rutas de `src/app/api` son adaptadores HTTP: parsean y validan la entrada, comprueban permisos y traducen resultados de aplicación a status JSON. Las reglas con persistencia están en `src/lib/*-use-cases.ts`; las respuestas y logs sanitizados usan `src/lib/http.ts` y `src/lib/safe-log.ts`.

Principales áreas:

- `auth`: inicio, cierre y consulta de sesión.
- `schedule`: agenda filtrada por fecha y por permisos.
- `reservations`: creación y modificación de reservas.
- `users`: administración de clientes y administradores.
- `courts/:courtId/lights`: control de iluminación.

### Dominio compartido

- `src/lib/auth.ts`: sesiones y autorización por rol.
- `src/lib/reservation-use-cases.ts`: reglas de creación de reservas, validación de recursos y conflictos PostgreSQL, separadas del contrato HTTP.
- `src/lib/user-use-cases.ts`: alta/actualización de usuarios, protección del último administrador, hash de contraseña y revocación de sesiones.
- `src/app/components/login-screen.tsx`: acceso y recuperación de contraseña.
- `src/app/components/clients-panel.tsx`: CRUD de clientes desde el rol administrador.
- `src/app/components/reservation-form.tsx`: presentación y lectura del formulario de reserva; delega el caso de uso al padre.
- `src/app/components/schedule-board.tsx`: presentación de fechas, pistas, reservas y acciones por callbacks.
- `src/app/hooks/use-schedule.ts`: carga asíncrona de agenda con cancelación de actualizaciones obsoletas.
- `src/lib/password.ts`: hash PBKDF2, verificación y transición desde hashes `bcrypt` y `scrypt` heredados.
- `src/lib/club-time.ts`: conversión entre hora local del club y UTC.
- `src/lib/http.ts`: utilidades HTTP comunes.
- `src/lib/client-api.ts`: contratos y transporte del cliente.

### Persistencia

`src/lib/prisma.ts` crea un cliente Prisma compartido sobre PostgreSQL mediante `@prisma/adapter-pg`. El esquema fuente está en `prisma/schema.prisma`; el cliente generado no se modifica manualmente.

## Principios SOLID aplicados

- **Responsabilidad única:** página, componentes, hook de agenda, cliente HTTP, casos de uso, autorización y persistencia tienen fronteras explícitas.
- **Abierto/cerrado:** nuevos endpoints pueden reutilizar `readJson`, `errorResponse` y el cliente API sin modificar su implementación.
- **Sustitución:** los contratos del cliente exponen tipos de respuesta estables frente a la implementación concreta de `fetch`.
- **Segregación:** el cliente API separa operaciones de autenticación, agenda, usuarios y reservas.
- **Inversión de dependencias:** los componentes emiten acciones mediante callbacks; la capa de aplicación depende de contratos tipados y no de URLs o detalles de `fetch`.

## Decisiones

- Las fechas se almacenan en PostgreSQL como `DateTime` y se convierten usando la zona `Europe/Madrid`.
- La autorización se comprueba siempre en el servidor; ocultar controles en React no es una medida de seguridad.
- La agenda de clientes omite el identificador de reservas ajenas y anonimiza su titular y detalles privados; sus claves visuales usan la hora de inicio.
- PostgreSQL es la autoridad final frente a carreras de reservas: la restricción de exclusión se traduce a un conflicto de dominio y la ruta responde `409`.
