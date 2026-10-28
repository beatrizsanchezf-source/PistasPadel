---
name: testing-ci
description: 'Use when adding or changing tests, running validation, debugging Vitest or Playwright, changing CI, or verifying PostgreSQL concurrency behavior.'
---

# Pruebas y CI

## Cuándo usarla

- Cambios de código que necesiten cobertura o validación.
- Errores de Vitest, integración PostgreSQL, Playwright o GitHub Actions.
- Modificación de configuración o workflows de pruebas.

## Procedimiento

1. Ejecuta primero el test más estrecho que cubra el comportamiento cambiado.
2. Usa Vitest para unit/component tests; `npm test` ejecuta la suite normal.
3. Usa `npm run test:integration` para pruebas PostgreSQL reales. Configura una base de pruebas aislada; la integración comprueba concurrencia de reservas.
4. Usa `npm run test:e2e` para flujos completos de navegador. Playwright requiere Chromium y HTTPS local.
5. Tras cambios de código ejecuta `npm run lint`; para cambios relevantes ejecuta también `npm run build`.
6. No informes que una suite pasó si no la ejecutaste. Distingue fallos preexistentes del alcance del cambio.
7. Mantén tests deterministas y no uses la base de producción.

## Comandos

```powershell
npm test
npm run test:integration
npm run test:e2e
npm run test:coverage
npm run lint
npm run build
```

## CI

`.github/workflows/ci.yml` provisiona PostgreSQL y ejecuta generación Prisma, migraciones, integración, lint, unit tests, build y E2E. Si cambias esta secuencia, actualiza la documentación de desarrollo y operaciones.