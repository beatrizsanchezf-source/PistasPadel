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

`src/app/page.tsx` es un componente cliente. Gestiona el estado visual, los formularios y la navegación de la pantalla principal. Las llamadas remotas se realizan mediante `src/lib/client-api.ts`, que evita duplicar URLs, cabeceras y lectura de errores.

### API

Las rutas de `src/app/api` validan la entrada, comprueban permisos y coordinan las operaciones de dominio. Las respuestas de error usan `src/lib/http.ts` para mantener un contrato JSON uniforme.

Principales áreas:

- `auth`: inicio, cierre y consulta de sesión.
- `schedule`: agenda filtrada por fecha y por permisos.
- `reservations`: creación y modificación de reservas.
- `users`: administración de clientes y administradores.
- `courts/:courtId/lights`: control de iluminación.

### Dominio compartido

- `src/lib/auth.ts`: sesiones y autorización por rol.
- `src/lib/password.ts`: hash PBKDF2, verificación y transición desde hashes `bcrypt` y `scrypt` heredados.
- `src/lib/club-time.ts`: conversión entre hora local del club y UTC.
- `src/lib/http.ts`: utilidades HTTP comunes.
- `src/lib/client-api.ts`: contratos y transporte del cliente.

### Persistencia

`src/lib/prisma.ts` crea un cliente Prisma compartido sobre PostgreSQL mediante `@prisma/adapter-pg`. El esquema fuente está en `prisma/schema.prisma`; el cliente generado no se modifica manualmente.

## Principios SOLID aplicados

- **Responsabilidad única:** UI, cliente HTTP, autenticación, tiempo del club y persistencia tienen fronteras separadas.
- **Abierto/cerrado:** nuevos endpoints pueden reutilizar `readJson`, `errorResponse` y el cliente API sin modificar su implementación.
- **Sustitución:** los contratos del cliente exponen tipos de respuesta estables frente a la implementación concreta de `fetch`.
- **Segregación:** el cliente API separa operaciones de autenticación, agenda, usuarios y reservas.
- **Inversión de dependencias:** la UI depende del contrato `api`, no de URLs ni detalles de `fetch`.

## Decisiones

- Las fechas se almacenan en PostgreSQL como `DateTime` y se convierten usando la zona `Europe/Madrid`.
- La autorización se comprueba siempre en el servidor; ocultar controles en React no es una medida de seguridad.
- La agenda de clientes omite el identificador de reservas ajenas y anonimiza su titular y detalles privados; sus claves visuales usan la hora de inicio.
