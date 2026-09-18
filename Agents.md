# Guía para agentes

## Proyecto

Punto de Oro es una aplicación Next.js 16 con React 19 y TypeScript para gestionar pistas de pádel, usuarios, reservas e iluminación. La interfaz está en español.

## Estructura relevante

- `src/app/page.tsx`: pantalla principal y componentes de interfaz cliente.
- `src/app/api/`: rutas API de Next.js.
- `src/lib/prisma.ts`: cliente Prisma compartido.
- `prisma/schema.prisma`: modelos y enumeraciones de PostgreSQL.
- `prisma/migrations/`: migraciones versionadas.
- `prisma/seed.ts`: datos iniciales para desarrollo.

## Datos y Prisma

- La base de datos es PostgreSQL y la conexión se obtiene de `DATABASE_URL`.
- No añadas credenciales ni archivos `.env` al control de versiones.
- Tras modificar `prisma/schema.prisma`, genera una migración con `npm run db:migrate -- --name <descripcion>`.
- Regenera el cliente Prisma con `npm run db:generate` si el cambio de esquema lo requiere.
- Mantén actualizada la semilla cuando un cambio de modelo necesite datos de desarrollo.
- `ReservationStatus` admite `PENDING`, `CONFIRMED` y `CANCELLED`.

## Convenciones de implementación

- Usa el alias `@/` para importar desde `src`.
- Las rutas API validan los datos de entrada y devuelven errores JSON con el código HTTP adecuado.
- Reutiliza `prisma` desde `@/lib/prisma`; no crees clientes Prisma por solicitud.
- Conserva la interfaz y los textos en español.
- Evita introducir librerías si la funcionalidad puede resolverse con las dependencias existentes.
- Mantén los cambios pequeños y no modifiques archivos generados en `src/generated/prisma` manualmente.

## Comandos

```powershell
npm run dev
npm run lint
npm run build
npm run db:migrate -- --name <descripcion>
npm run db:generate
npm run db:seed
```

## Verificación

- Ejecuta `npm run lint` después de cambios de código.
- Ejecuta `npm run build` antes de dar por finalizado un cambio relevante.
- Si se modifica la base de datos, aplica la migración y verifica la ruta o pantalla afectada con datos reales.
