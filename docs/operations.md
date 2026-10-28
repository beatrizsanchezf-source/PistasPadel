# Operación y recuperación

## Despliegue

1. Proporciona `DATABASE_URL` desde un gestor de secretos y prepara PostgreSQL con acceso desde la aplicación.
2. Ejecuta `npm ci`, `npm run db:generate` y `npm run db:deploy` como parte del release.
3. Configura TLS en el proxy inverso y establece `APP_URL` con el dominio HTTPS público.
4. Verifica `MAIL_FROM` en Resend y configura `RESEND_API_KEY` como secreto.
5. Configura `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` y `TRUSTED_CLIENT_IP_HEADER`. El balanceador debe sobrescribir la cabecera IP elegida; no permitas acceso directo que pueda falsificarla.
6. Arranca con `npm run start` y verifica `GET /api/health`. En producción esta ruta comprueba PostgreSQL y Redis sin devolver credenciales.
7. Programa diariamente `npm run db:cleanup-expired` con el scheduler del proveedor.

No ejecutes `npm run db:seed` en producción. Usa un release versionado y aplica migraciones revisadas; no uses `migrate reset` sobre datos de producción.

## Copia de seguridad

La copia debe almacenarse cifrada, fuera del servidor de aplicación y con acceso restringido. Nunca guardes volcados en el repositorio, `coverage/`, `public/` ni rutas servidas por Next.

En PowerShell, con PostgreSQL Client Tools instaladas:

```powershell
$env:PGPASSWORD = "<contraseña introducida localmente>"
pg_dump --format=custom --no-owner --file="pistas-padel-$(Get-Date -Format yyyyMMdd-HHmm).dump" "$env:DATABASE_URL"
Remove-Item Env:PGPASSWORD
```

Guarda la copia en un almacenamiento cifrado con retención acorde a la política del club. No pegues la URL, la contraseña ni el contenido del dump en tickets o chats.

## Ensayo de restauración

Restaura siempre primero en una base temporal; nunca sobrescribas la base original para probar una copia:

```powershell
createdb pistas_padel_restore_test
$restoreUrl = $env:DATABASE_URL -replace "/pistas_padel\?", "/pistas_padel_restore_test?"
pg_restore --no-owner --clean --if-exists --dbname="$restoreUrl" .\pistas-padel-YYYYMMDD-HHMM.dump
```

Después verifica el historial de migraciones, cuentas, pistas, reservas y las restricciones de no-solapamiento en esa base temporal. Elimina la base temporal solo cuando la verificación haya terminado y la copia original permanezca intacta. Registra fecha, duración, resultado y responsable del ensayo.

## Diagnóstico de dependencias

- `GET /api/health`: comprueba PostgreSQL y Redis en producción.
- El endpoint de recuperación responde de manera genérica para no revelar si una cuenta existe. Los fallos de entrega se registran con códigos sanitizados; consulta los eventos de Resend para el detalle de entrega.
- Una respuesta `503` en `/api/*` en producción suele indicar Redis ausente/no disponible. Revisa la disponibilidad del proveedor y la configuración del proxy; no desactives el rate limit para ocultar el problema.
- Alertas recomendadas: healthcheck fallido, aumento de respuestas `5xx`, fallos `429` anómalos, errores de entrega de Resend y fallos del job de limpieza.