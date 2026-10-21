# Desarrollo local

## Requisitos

- Node.js compatible con Next.js 16.
- PostgreSQL accesible desde la máquina local.
- npm.

## Configuración

1. Instala dependencias:

   ```powershell
   npm install
   ```

2. Copia `.env.example` a `.env` y configura `DATABASE_URL`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Para activar la recuperación de contraseña, define además `APP_URL`, `RESEND_API_KEY` y `MAIL_FROM` con una cuenta de Resend y un remitente verificado.

3. Inicia PostgreSQL local con Docker Compose (solo base de datos; la app corre con Node en el host):

   ```powershell
   docker compose up -d postgres
   ```

4. Genera el cliente Prisma:

   ```powershell
   npm run db:generate
   ```

5. Aplica las migraciones versionadas:

   ```powershell
   npm run db:deploy
   ```

6. Carga datos de demostración solo en desarrollo:

   ```powershell
   npm run db:seed
   ```

La contraseña `postgres` que usa `compose.yaml` por defecto es solo para desarrollo local. Sobrescríbela mediante `POSTGRES_PASSWORD` si el puerto o las credenciales locales difieren.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor HTTPS de desarrollo en `https://localhost:3000`. |
| `npm run build` | Compilación de producción. |
| `npm run start` | Ejecuta la compilación de producción. |
| `npm run lint` | Comprueba ESLint. |
| `npm test` | Ejecuta Vitest una vez. |
| `npm run test:watch` | Ejecuta Vitest en modo observación. |
| `npm run test:coverage` | Genera cobertura con V8. |
| `npm run test:e2e` | Ejecuta las pruebas E2E con Playwright. |
| `npm run db:generate` | Regenera el cliente Prisma. |
| `npm run db:migrate -- --name <nombre>` | Crea y aplica una migración local. |
| `npm run db:deploy` | Aplica migraciones existentes, recomendado para despliegue. |
| `npm run db:seed` | Carga datos de demostración en desarrollo. |

## Flujo antes de integrar cambios

```powershell
npm test
npm run lint
npm run build
```

La primera vez que ejecutes Playwright instala Chromium:

```powershell
npx playwright install chromium
```

El servidor de desarrollo usa `certificates/localhost.pem` y `certificates/localhost-key.pem`. Si no existen, créalos con el `mkcert` descargado por Next.js o usa el certificado local de tu entorno. El navegador puede mostrar un aviso porque el certificado no procede de una autoridad pública; en desarrollo local puedes aceptarlo. Playwright usa `ignoreHTTPSErrors: true` para poder ejecutar las pruebas con ese certificado.

## Trace viewer de Playwright

La configuración usa `trace: "retain-on-failure"`. Los tests correctos no conservan trazas; cuando uno falla, Playwright guarda un `trace.zip` dentro de `test-results` con la secuencia de acciones, snapshots del DOM, capturas, peticiones de red y mensajes de consola.

Ejecuta los tests con:

```powershell
npm run test:e2e
```

Para abrir una traza concreta:

```powershell
npx playwright show-trace test-results\<carpeta-del-test>\trace.zip
```

También puedes abrir el informe HTML:

```powershell
npx playwright show-report
```

En el Trace Viewer revisa la línea temporal, selecciona la acción inmediatamente anterior al fallo y consulta las pestañas **Call**, **Action**, **Network**, **Console** y **Snapshot**. Para investigar una intermitencia concreta, ejecuta el test varias veces y conserva el `trace.zip` del fallo.

Si cambia `prisma/schema.prisma`, genera la migración y regenera Prisma. No edites manualmente `src/generated/prisma`.

## Problemas frecuentes

### Puerto 3000 ocupado

Comprueba el proceso que escucha en el puerto y usa el servidor existente o ciérralo antes de iniciar otro:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

### Esquema desactualizado

En desarrollo usa `npm run db:migrate`. Para una base de datos con historial válido y migraciones ya creadas usa `npm run db:deploy`. No uses `prisma migrate reset` si necesitas conservar datos.

### Respuestas JSON vacías

Consulta primero la terminal de Next.js. Un `response.json()` fallará si una ruta API termina con `500` sin cuerpo; corrige el error del servidor antes de cambiar el cliente.

### Límite de peticiones

Las rutas `/api/*` aceptan hasta 60 peticiones por minuto y por IP. Si se supera el límite, la aplicación responde con `429`. En despliegues con varias instancias, sustituye el almacenamiento en memoria de `src/proxy.ts` por Redis u otro almacén compartido.
