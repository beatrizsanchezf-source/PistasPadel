---
name: operations-docs
description: 'Use when changing environment configuration, local HTTPS, deployment, health checks, Redis operations, backup and restore, cleanup jobs, or project documentation.'
---

# Operación y documentación

## Cuándo usarla

- Variables de entorno, comandos de desarrollo, despliegue o requisitos de infraestructura.
- Healthcheck, limpieza programada, copias de seguridad o recuperación.
- Actualización de README, manuales, contratos API o guías de desarrollo.

## Procedimiento

1. Confirma los scripts disponibles en `package.json` y la configuración real antes de documentar comandos.
2. Mantén `.env.example` sincronizado con variables requeridas, sin incluir valores reales ni secretos.
3. `npm run dev` usa HTTPS local con `certificates/localhost.pem` y `certificates/localhost-key.pem`; los certificados son locales, están ignorados por Git y no sirven para producción.
4. En producción configura TLS en el proxy/load balancer, `APP_URL` con el dominio HTTPS y Upstash Redis REST. El balanceador debe sobrescribir `TRUSTED_CLIENT_IP_HEADER`.
5. Documenta `/api/health`, la limpieza con `npm run db:cleanup-expired` y el programa/entorno que la ejecuta.
6. Antes de describir backups, revisa `docs/operations.md`; no ejecutes restauraciones ni tareas destructivas sin autorización.
7. Actualiza la documentación más específica afectada: `docs/development.md`, `docs/operations.md`, `docs/security-and-testing.md`, `docs/database.md` o `docs/user-manual.md`.
8. Comprueba que rutas, nombres de archivo, scripts, límites de rate limit y ejemplos coinciden con el código.

## Documentación principal

- `README.md`: inicio rápido, modelo y árbol del repositorio.
- `docs/architecture.md`: límites y decisiones arquitectónicas.
- `docs/api.md`: contratos HTTP y permisos.
- `docs/database.md`: modelos y migraciones.
- `docs/development.md`: configuración local, comandos y pruebas.
- `docs/operations.md`: despliegue, backups y mantenimiento.
- `docs/security-and-testing.md`: controles de seguridad y cobertura.
- `docs/user-manual.md`: flujos para clientes y administradores.