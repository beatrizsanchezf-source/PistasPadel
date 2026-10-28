# Guía para agentes

## Proyecto

Pistas Padel San Cristobal de Segovia es una aplicación Next.js 16, React 19 y TypeScript para gestionar pistas de pádel, usuarios, reservas e iluminación. La interfaz y los mensajes visibles están en español. Usa PostgreSQL con Prisma 7; `DATABASE_URL` configura la conexión.

## Reglas comunes

- Usa el alias `@/` para importaciones desde `src/`.
- No añadas secretos ni archivos `.env` al control de versiones; conserva `.env.example` sin credenciales reales.
- No edites manualmente `src/generated/prisma/`; regenera el cliente con `npm run db:generate`.
- Evita nuevas dependencias si la funcionalidad puede resolverse con las existentes.
- Mantén los cambios enfocados y conserva el comportamiento existente fuera del alcance solicitado.
- Antes de cambiar APIs de Next.js, consulta la guía local correspondiente en `node_modules/next/dist/docs/`.
- Para funcionalidades o cambios de comportamiento relevantes, usa por defecto SDD híbrido y automático según [Desarrollo guiado por especificaciones](.github/skills/spec-driven-development/SKILL.md). Omítelo para cambios triviales, mecánicos o solo documentales.

## Skills del proyecto

- Base de datos y migraciones: [Prisma y PostgreSQL](.github/skills/prisma-postgres/SKILL.md).
- Endpoints, autorización, validación y rate limits: [API y seguridad](.github/skills/api-security/SKILL.md).
- Login, sesiones, PBKDF2 y recuperación: [Autenticación](.github/skills/authentication/SKILL.md).
- Reservas, agenda, concurrencia y privacidad: [Reservas y agenda](.github/skills/reservations-schedule/SKILL.md).
- Componentes React y experiencia de usuario: [Interfaz](.github/skills/frontend/SKILL.md).
- Capas, casos de uso y SOLID: [Arquitectura](.github/skills/architecture/SKILL.md).
- Unit, integración, E2E y verificación: [Pruebas y CI](.github/skills/testing-ci/SKILL.md).
- Variables, despliegue, backups y documentación: [Operación y documentación](.github/skills/operations-docs/SKILL.md).
- Especificación automática, modo híbrido y criterios verificables: [Desarrollo guiado por especificaciones](.github/skills/spec-driven-development/SKILL.md).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
