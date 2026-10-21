# Pistas Padel San Cristobal de Segovia

Aplicación Next.js para administrar tres pistas de pádel, sus usuarios, reservas por día y el estado de iluminación.

## Documentación

- [Desarrollo local y comandos](docs/development.md)
- [Arquitectura y principios SOLID](docs/architecture.md)
- [API HTTP](docs/api.md)
- [Base de datos y migraciones](docs/database.md)
- [Seguridad y pruebas](docs/security-and-testing.md)
- [Manual de usuario](docs/user-manual.md)
- [Gestión de la protección de GitHub con Terraform](infra/github/README.md)

## Acceso y permisos

Cada usuario inicia sesión con su correo y contraseña. Las sesiones se guardan de forma segura en PostgreSQL y se mantienen mediante una cookie HTTP segura.

- Las cuentas `CUSTOMER` pueden consultar la agenda y crear reservas.
- Las cuentas `ADMIN` también pueden encender o apagar las luces y acceder a la gestión de clientes.

En desarrollo, define las credenciales iniciales de administración en las variables de entorno antes de ejecutar la semilla. La semilla no debe ejecutarse en producción.

```text
ADMIN_EMAIL="admin@example.test"
ADMIN_PASSWORD="una-contrasena-larga-y-unica"
```

No uses contraseñas predecibles ni ejecutes `npm run db:seed` fuera del entorno de desarrollo.

## Base de datos

Necesitas una instancia de PostgreSQL. Copia `.env.example` como `.env` y adapta `DATABASE_URL` con las credenciales de tu servidor.

```powershell
Copy-Item .env.example .env
```

La URL sigue el formato `postgresql://USUARIO:CONTRASENA@HOST:5432/BASE?schema=public`. Define también `ADMIN_EMAIL` y `ADMIN_PASSWORD` con una contraseña de al menos 12 caracteres para crear la cuenta inicial de administración en desarrollo. Para iniciar PostgreSQL localmente puedes usar `docker compose up -d postgres`.

Genera el cliente Prisma, aplica las migraciones versionadas y carga datos iniciales:

```powershell
npm run db:generate
npm run db:deploy
npm run db:seed
```

La semilla crea tres pistas, una cuenta administradora y tres clientes para desarrollo.

## Ejecutar

```powershell
npm run dev
```

Abre `https://localhost:3000` y acepta el certificado local autofirmado si el navegador lo solicita.

## Despliegue

En producción, configura `DATABASE_URL` y aplica las migraciones sin usar la base de datos sombra de desarrollo:

```powershell
npm run db:deploy
npm run build
npm run start
```

No ejecutes `npm run db:seed` en producción. La semilla se bloquea cuando `NODE_ENV=production` y debe emplearse solo para preparar un entorno local de demostración.

## Seguridad

- Las contraseñas nuevas se guardan con PBKDF2-HMAC-SHA-256 (sal aleatoria y 600 000 iteraciones); los hashes `bcrypt` y `scrypt` heredados se convierten a PBKDF2 al iniciar sesión correctamente.
- Las sesiones caducan a los siete días. La cookie es `HttpOnly`, `SameSite=Strict` y se marca como `Secure` en producción bajo HTTPS.
- PostgreSQL almacena el hash del token de sesión, no el token original.
- El inicio de sesión limita intentos fallidos y la API tiene un límite de peticiones por IP. En despliegues con varias instancias, usa un almacén compartido para estos contadores.
- La aplicación establece CSP, HSTS en producción, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`.

## Validación automatizada

El workflow de GitHub Actions ejecuta `npm run lint`, `npm test`, `npm run build` y las pruebas E2E de Playwright en Chromium. Antes de entregar, ejecuta también esos comandos localmente.

## Modelo

- `User`: nombre, correo, teléfono, contraseña cifrada y rol.
- `UserRole`: rol `ADMIN` o `CUSTOMER` para controlar permisos.
- `Session`: sesiones de inicio de sesión con fecha de caducidad.
- `Court`: las tres pistas, sus características y si su luz está encendida.
- `Reservation`: usuario, pista, hora de inicio y fin, jugadores, estado y si solicita luz.

Los clientes crean únicamente reservas propias, inicialmente pendientes. Los administradores pueden reservar para cualquier cliente, confirmar reservas, consultar datos de clientes y controlar la iluminación. Los clientes reciben disponibilidad y sus propias reservas; los datos de terceros se reservan para administradores.

La agenda consulta `GET /api/schedule?date=AAAA-MM-DD` y los interruptores guardan la luz mediante `PATCH /api/courts/:courtId/lights`.

## Estructura principal

```text
.
├── docs/                                  Documentación técnica y de usuario
│   ├── api.md                             Contratos HTTP y permisos
│   ├── architecture.md                    Arquitectura y principios SOLID
│   ├── database.md                        Modelo, migraciones y semilla
│   ├── development.md                     Instalación, comandos, HTTPS y Trace Viewer
│   ├── security-and-testing.md            Seguridad y estrategia de pruebas
│   └── user-manual.md                     Manual para clientes y administradores
├── e2e/
│   └── home.spec.ts                       Prueba end-to-end con Playwright
├── infra/github/                          Protección del repositorio con Terraform
├── prisma/
│   ├── migrations/                        Historial versionado de PostgreSQL
│   ├── schema.prisma                      Modelos y enumeraciones
│   └── seed.ts                            Datos de demostración
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts         Inicio de sesión
│   │   │   │   ├── logout/route.ts        Cierre de sesión
│   │   │   │   └── me/route.ts            Usuario de la sesión actual
│   │   │   ├── courts/[courtId]/lights/route.ts  Control de iluminación
│   │   │   ├── reservations/route.ts      Crear reservas
│   │   │   ├── reservations/[reservationId]/route.ts  Editar reservas
│   │   │   ├── schedule/route.ts          Consultar agenda
│   │   │   └── users/
│   │   │       ├── route.ts               Listar y crear usuarios
│   │   │       ├── [userId]/route.ts      Editar usuarios
│   │   │       └── first/route.ts         Endpoint de alta inicial retirado
│   │   ├── globals.css                    Estilos globales
│   │   ├── layout.tsx                     Layout raíz y metadata
│   │   ├── page.tsx                       Interfaz principal
│   │   └── page.test.tsx                  Tests de login, agenda y permisos
│   ├── generated/prisma/                  Cliente generado; no editar manualmente
│   ├── lib/
│   │   ├── auth.ts                        Sesiones y autorización
│   │   ├── client-api.ts                  Cliente HTTP tipado del navegador
│   │   ├── club-time.ts                   Conversiones de Europe/Madrid
│   │   ├── club-time.test.ts              Tests de zona horaria
│   │   ├── http.ts                        Utilidades de respuestas HTTP
│   │   ├── password.ts                    Hash PBKDF2 y compatibilidad bcrypt/scrypt
│   │   ├── password.test.ts               Tests de contraseñas
│   │   ├── prisma.ts                      Cliente Prisma compartido
│   │   ├── user-validation.ts             Validación y normalización de usuarios
│   │   └── user-validation.test.ts        Tests de validación
│   ├── proxy.ts                           Rate limit para `/api/*`
│   └── test/setup.ts                      Configuración común de Vitest
├── .opencode/
│   └── agents/review.md                   Instrucciones del agente de revisión
├── certificates/                          Certificados HTTPS locales (ignorados por Git)
├── .gitignore                             Exclusiones de Git
├── .env.example                           Plantilla de variables de entorno
├── Agents.md                              Instrucciones para agentes del proyecto
├── eslint.config.mjs                      Configuración de ESLint
├── next-env.d.ts                          Tipos generados por Next.js
├── next.config.ts                         HTTPS/headers y configuración Next.js
├── package.json                           Scripts y dependencias
├── package-lock.json                      Versiones resueltas de dependencias npm
├── playwright.config.ts                   Configuración de pruebas E2E
├── postcss.config.mjs                     Configuración de PostCSS/Tailwind
├── prisma.config.ts                       Configuración de Prisma 7
├── tsconfig.json                          Configuración de TypeScript
└── vitest.config.mts                      Configuración de Vitest
```

Los directorios `node_modules/`, `.next/`, `coverage/`, `playwright-report/` y `test-results/` contienen dependencias o resultados generados; no forman parte del código fuente mantenido. Los archivos bajo `src/generated/prisma/` se regeneran con `npm run db:generate` y no deben editarse manualmente. Los certificados de `certificates/` son locales y no deben subirse al repositorio.
