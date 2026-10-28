# Desarrollo local

## Requisitos

- Node.js compatible con Next.js 16.
- PostgreSQL accesible desde la máquina local (o Docker Compose).
- npm.

## Configuración

1. Instala dependencias:

   ```powershell
   npm install
   ```

2. Copia `.env.example` a `.env` y configura `DATABASE_URL`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Para activar la recuperación define `APP_URL`, `RESEND_API_KEY` y un `MAIL_FROM` de dominio verificado en Resend. En producción configura Upstash con `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`, y confirma que el balanceador sobrescriba la cabecera indicada por `TRUSTED_CLIENT_IP_HEADER`.

3. Inicia PostgreSQL local con Docker Compose (solo base de datos; la aplicación corre con Node en el host):

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

La prueba de concurrencia con PostgreSQL usa una base desechable:

```powershell
npm run test:integration
```

En producción, programa `npm run db:cleanup-expired` diariamente con el scheduler del proveedor o cron. Ejemplo de crontab (03:15 UTC), ejecutado desde el directorio del release:

```cron
15 3 * * * cd /srv/pistas-padel/current && npm run db:cleanup-expired >> /var/log/pistas-padel-cleanup.log 2>&1
```

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor HTTPS de desarrollo en `https://localhost:3000`, con certificado local. |
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
| `npm run db:cleanup-expired` | Borra sesiones, tokens de reset e intentos de login expirados. |
| `npm run test:integration` | Prueba concurrencia de reservas contra PostgreSQL. |
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

El servidor de desarrollo usa `certificates/localhost.pem` y `certificates/localhost-key.pem`, ignorados por Git. Si no existen, créalos con `mkcert localhost 127.0.0.1 ::1` o genera certificados de desarrollo para localhost; no reutilices estos certificados en producción. En producción, termina TLS en el proxy/load balancer y configura `APP_URL` con el dominio HTTPS público.

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

Rate limits de desarrollo (ventana fija de 60 segundos, por IP): API general `60`, login `10` y endpoints de recuperación `5` en conjunto. El login también registra hasta 5 fallos por email durante 15 minutos; la recuperación permite una solicitud por cuenta cada minuto. El proxy usa memoria local en desarrollo, así que los contadores se reinician al reiniciar Node y no se comparten entre instancias.

En producción, configura Upstash Redis REST y la cabecera `TRUSTED_CLIENT_IP_HEADER` del proxy. Redis debe estar disponible: sin él, las rutas API responden `503` en vez de aceptar peticiones sin límite. El balanceador debe sobrescribir la cabecera de IP confiable.
