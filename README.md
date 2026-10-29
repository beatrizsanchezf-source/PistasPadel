# Pistas Padel San Cristobal de Segovia

## Descripción general

Aplicación web para administrar las tres pistas de pádel del club: agenda diaria, reservas, usuarios e iluminación. La interfaz está en español y adapta las acciones y los datos visibles según el rol (`CUSTOMER` o `ADMIN`).

## Documentación

- [Despliegue de producción](docs/deployment.md)
- [Desarrollo local y comandos](docs/development.md)
- [Arquitectura y principios SOLID](docs/architecture.md)
- [API HTTP](docs/api.md)
- [Base de datos y migraciones](docs/database.md)
- [Seguridad y pruebas](docs/security-and-testing.md)
- [Operación, copias y restauración](docs/operations.md)
- [Manual de usuario](docs/user-manual.md)
- [Protección de GitHub con Terraform](infra/github/README.md)

## Stack tecnológico

- **Runtime y framework:** Node.js 22, Next.js 16.3 y React 19.
- **Lenguaje y estilos:** TypeScript 5.9 y Tailwind CSS 4.
- **Persistencia:** PostgreSQL 16, Prisma 7 y `@prisma/adapter-pg`.
- **Autenticación:** sesiones en PostgreSQL y contraseñas con PBKDF2-HMAC-SHA-256; se verifican hashes `bcrypt`/`scrypt` heredados para migrarlos al iniciar sesión.
- **Correo de recuperación:** API de Resend, opcional y configurable.
- **Rate limiting de producción:** Upstash Redis REST.
- **Pruebas:** Vitest, React Testing Library y Playwright con Chromium.
- **CI:** GitHub Actions; Compose se utiliza para PostgreSQL local, no para contenerizar la aplicación.

## Funcionalidades principales

- Inicio y cierre de sesión con roles `CUSTOMER` y `ADMIN`.
- Agenda de siete días con reservas por pista y zona horaria `Europe/Madrid`.
- Creación de reservas propias por clientes y gestión de reservas por administradores.
- Control persistente de iluminación de las pistas, disponible para administradores.
- Administración de cuentas y protección contra la eliminación del último administrador.
- Recuperación de contraseña mediante enlace de un solo uso, con expiración de 30 minutos y revocación de sesiones al cambiarla.
- Privacidad por rol: los clientes no reciben identificadores ni datos privados de reservas de otros usuarios.
- Restricción PostgreSQL contra reservas activas solapadas en una misma pista.
- Cabeceras de seguridad, CSP con nonce y límites de peticiones; producción falla de forma cerrada si Upstash no está disponible.

## Instalación y ejecución local

### Requisitos

- Node.js 22 y npm.
- Docker Desktop con Compose, o PostgreSQL 16 accesible.
- `mkcert` para generar los certificados HTTPS locales si no están presentes.

### Preparar base de datos y entorno

Desde PowerShell, en la raíz del repositorio:

```powershell
npm ci
Copy-Item .env.example .env
docker compose up -d postgres
npm run db:generate
npm run db:deploy
npm run db:seed
```

La plantilla `.env.example` configura PostgreSQL local y credenciales de demostración. Si usas otra instancia, cambia `DATABASE_URL`. Para el envío de recuperación, configura `APP_URL`, `RESEND_API_KEY` y un `MAIL_FROM` autorizado por Resend. No se necesita Redis para desarrollo local.

El comando de desarrollo espera `certificates/localhost.pem` y `certificates/localhost-key.pem`; estos archivos son locales y están ignorados por Git. Si faltan, créalos con:

```powershell
mkcert -install
mkcert -key-file certificates/localhost-key.pem -cert-file certificates/localhost.pem localhost 127.0.0.1 ::1
```

Arranca Next.js:

```powershell
npm run dev
```

Abre <https://localhost:3000>. El certificado es de desarrollo; el navegador puede pedir confirmación. No reutilices estos certificados en producción.

### Comandos útiles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo HTTPS. |
| `npm run lint` | ESLint. |
| `npm test` | Pruebas unitarias y de componentes. |
| `npm run test:integration` | Integración de concurrencia contra PostgreSQL desechable. |
| `npm run test:e2e` | Flujos del navegador con Playwright/Chromium. |
| `npm run build` | Compilación de producción. |
| `npm run start` | Arranca el build de producción. |
| `npm run db:generate` | Regenera el cliente Prisma. |
| `npm run db:deploy` | Aplica migraciones existentes. |
| `npm run db:seed` | Carga datos de demostración; solo desarrollo. |

Para el procedimiento productivo completo, variables, proxy TLS, migraciones, comprobación de salud y rollback, consulta [Despliegue de producción](docs/deployment.md).

## Usuario de prueba

Al copiar `.env.example` sin modificarlo y ejecutar `npm run db:seed` en desarrollo, puedes entrar con:

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Administrador | `admin@example.test` | `cambia-esta-contrasena-larga` |
| Cliente de demostración | `maria@example.test` | `cambia-esta-contrasena-larga` |

La semilla crea también `pablo@example.test` y `carlos@example.test`; comparten la contraseña definida en `ADMIN_PASSWORD`. Si cambias `ADMIN_EMAIL` o `ADMIN_PASSWORD` en `.env`, usa esos nuevos valores después de volver a ejecutar la semilla.

**Estas credenciales solo sirven para una base local de desarrollo.** La semilla rechaza `NODE_ENV=production`; no uses esas credenciales ni datos de demostración en producción.

## Estructura del proyecto

```text
.
├── .github/
│   ├── instructions/              Instrucciones de Copilot
│   ├── skills/                    Guías por dominio para agentes
│   ├── specs/                     Especificaciones de cambios relevantes
│   └── workflows/ci.yml           Integración continua
├── docs/                          Desarrollo, API, arquitectura y operación
├── e2e/                           Pruebas de navegador con Playwright
├── infra/github/                  Protección de rama con Terraform
├── prisma/
│   ├── migrations/                Migraciones versionadas
│   ├── schema.prisma              Modelos PostgreSQL
│   ├── seed.ts                    Datos demo solo para desarrollo
│   └── cleanup-expired.ts         Limpieza de registros vencidos
├── src/
│   ├── app/
│   │   ├── api/                   Route Handlers de Next.js
│   │   ├── components/            Login, clientes, reservas y agenda
│   │   ├── hooks/                 Hooks de interfaz
│   │   ├── globals.css            Estilos globales
│   │   ├── layout.tsx             Layout raíz
│   │   ├── page.tsx               Composición de la pantalla principal
│   │   └── page.test.tsx           Pruebas de interfaz
│   ├── generated/prisma/          Cliente generado; no editar manualmente
│   ├── lib/                       Auth, validación, Prisma y casos de uso
│   ├── proxy.ts                   CSP, cabeceras y rate limits
│   └── test/setup.ts              Configuración común de Vitest
├── .env.example                   Plantilla de entorno, sin secretos reales
├── .mcp.json                      MCP Engram de este workspace
├── compose.yaml                   PostgreSQL local
├── next.config.ts                 Configuración y cabeceras Next.js
├── package.json                   Dependencias y scripts npm
├── playwright.config.ts           Configuración de E2E
├── prisma.config.ts               Configuración de Prisma 7
├── vitest.config.mts              Pruebas unitarias y cobertura
└── vitest.integration.config.mts   Pruebas PostgreSQL de integración
```

El cliente bajo `src/generated/prisma/` se regenera con `npm run db:generate`; no lo edites manualmente. Los directorios `.next/`, `node_modules/`, `coverage/`, `playwright-report/` y `test-results/` son generados y no forman parte del código fuente.

## URL DE PRODUCCIÓN

https://pistaspadel.onrender.com

## Usuarios y contraseñas de prueba

Administrador:  admin@example.test
Clientes:       maria@example.test
                pablo@example.test
                carlos@example.test
En desarrollo local, la contraseña se define mediante `ADMIN_PASSWORD` en `.env` antes de ejecutar la semilla. No se publica una contraseña para el servicio de producción.
