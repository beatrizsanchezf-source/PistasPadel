---
name: prisma-postgres
description: 'Use when changing PostgreSQL data models, Prisma schema, migrations, seeds, indexes, constraints, or database cleanup in this project.'
---

# Prisma y PostgreSQL

## Cuándo usarla

- Cambios en `prisma/schema.prisma`, migraciones, relaciones, enums o restricciones.
- Cambios en la semilla, acceso a datos o tareas de limpieza.
- Diagnóstico de diferencias entre Prisma y PostgreSQL.

## Procedimiento

1. Revisa el modelo y las migraciones cercanas antes de cambiar el esquema.
2. Usa el cliente compartido de `@/lib/prisma`; no instancies Prisma por solicitud.
3. En desarrollo crea la migración con `npm run db:migrate -- --name <descripcion>`.
4. Regenera el cliente con `npm run db:generate` cuando el esquema lo requiera. Nunca edites `src/generated/prisma/` manualmente.
5. Actualiza `prisma/seed.ts` si los datos de desarrollo dependen del nuevo modelo. La semilla no debe ejecutarse en producción.
6. Para despliegues usa `npm run db:deploy`, no `db:migrate`.
7. Añade o ajusta pruebas de datos y ejecuta `npm run test:integration` cuando el cambio afecte integridad o concurrencia.
8. Revisa `docs/database.md` y `docs/operations.md` si cambian el esquema o sus procedimientos operativos.

## Reglas del proyecto

- PostgreSQL es la base de datos y `DATABASE_URL` configura su conexión.
- `ReservationStatus`: `PENDING`, `CONFIRMED`, `CANCELLED`, `NO_SHOW`.
- Las migraciones versionadas viven en `prisma/migrations/`.
- No ejecutes una operación destructiva de base de datos sin autorización explícita.