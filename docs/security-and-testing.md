# Seguridad y pruebas

## Seguridad

- Las contraseñas nuevas se almacenan con PBKDF2-HMAC-SHA-256, sal aleatoria de 16 bytes y 600 000 iteraciones. Los hashes heredados de `bcrypt` y `scrypt` se verifican durante la transición y se convierten a PBKDF2 tras un inicio de sesión correcto.
- Nunca se devuelve `passwordHash` en las respuestas de usuario.
- La cookie de sesión es `HttpOnly`, `SameSite=Strict` y `Secure` en producción.
- La recuperación utiliza tokens aleatorios de un solo uso, guarda únicamente el hash del token, caduca a los 30 minutos y revoca las sesiones tras cambiar la contraseña. El envío requiere `APP_URL`, `RESEND_API_KEY` y un `MAIL_FROM` verificado por Resend.
- PostgreSQL almacena el hash del token de sesión.
- Las rutas comprueban autenticación y rol en el servidor.
- Todos los cuerpos JSON entrantes pasan por `readJson`: exige `application/json`, limita el cuerpo a 64 KiB, valida UTF-8 y rechaza JSON mal formado. Los emails se canonizan en NFC/minúsculas; nombres, contraseñas y notas rechazan controles/bidi, las notas tienen límite y las rutas no insertan HTML proporcionado por el usuario.
- Los logs de servidor guardan un evento y un código de error allow-list; no imprimen excepciones completas, cuerpos HTTP, tokens, contraseñas, emails ni respuestas completas de Resend.
- `src/proxy.ts` aplica ventanas fijas de 60 s por IP: API general `60`, login `10` y ambos endpoints de recuperación combinados `5`. Además, `/api/auth/login` permite 5 fallos por email cada 15 min (`LoginAttempt`) y `/api/auth/password-reset` limita a una solicitud por usuario cada 60 s. Las respuestas limitadas devuelven `429`, `Retry-After` y `X-RateLimit-*`.
- En desarrollo el contador del proxy vive en memoria del proceso y se reinicia al reiniciar Node; no sirve para varias instancias. En producción se exige Upstash Redis REST compartido para todas las rutas API: si falta o falla, se responde `503` (fail closed). La URL Redis se restringe a HTTPS bajo `*.upstash.io`.
- La IP se obtiene de `TRUSTED_CLIENT_IP_HEADER` (por defecto `x-real-ip`) y se guarda como HMAC, no en claro. El balanceador debe sobrescribir esa cabecera; no expongas Next directamente a clientes que puedan falsificarla.
- Las cabeceras de seguridad se configuran en `next.config.ts` y `src/proxy.ts`. La CSP usa un nonce aleatorio por petición; `unsafe-eval` solo se habilita en desarrollo. HSTS se envía en producción sin `includeSubDomains`, ya que no se ha verificado HTTPS para todos los subdominios.
- `.env` está excluido de Git. No añadas credenciales, tokens ni dumps de base de datos.

## Pruebas automatizadas

La suite usa Vitest para reglas de dominio, rutas críticas y componentes; Playwright valida recorridos de navegador en Chromium. El workflow `.github/workflows/ci.yml` ejecuta lint, tests, build y E2E en cada push y pull request.

Las pruebas de componentes usan React Testing Library, `user-event` y `jsdom`. El cliente API se mockea para mantener las pruebas aisladas de PostgreSQL y del servidor Next.js.

La suite automatizada verifica:

- inicio de sesión correcto y error de credenciales;
- carga de la agenda y permisos visibles por rol;
- solicitud de restablecimiento y respuesta anti-enumeración;
- hash y expiración del token, cambio de contraseña y revocación de sesiones;
- derivación PBKDF2 y compatibilidad temporal con hashes heredados;
- reglas de horario del club y validación de entradas.

La integración `src/lib/reservation-postgres.integration.test.ts` envía dos reservas solapadas en paralelo a PostgreSQL real y verifica la restricción de exclusión. CI la ejecuta contra su servicio PostgreSQL; localmente se ejecuta con `npm run test:integration` y `DATABASE_URL` apuntando a una base desechable.

```powershell
npm test
npm run test:watch
npm run test:coverage
```

## Validación manual

1. Inicia PostgreSQL y configura `.env`.
2. Ejecuta migraciones y semilla en desarrollo.
3. Arranca `npm run dev`.
4. Comprueba login correcto e incorrecto.
5. Comprueba que un cliente solo ve sus datos completos.
6. Comprueba que un cliente no puede activar luces ni gestionar usuarios.
7. Comprueba creación y edición de reservas.
8. Comprueba solapamientos de reservas y fechas pasadas.
9. Comprueba expiración/cierre de sesión.
10. Ejecuta `npm test`, `npm run lint` y `npm run build`.

## Riesgos pendientes

- El E2E usa respuestas API simuladas para ser determinista; la prueba PostgreSQL de concurrencia complementa, pero no reemplaza, una suite E2E completa conectada a datos reales.
- En producción deben definirse `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` y una topología de proxy que garantice la cabecera de IP confiable; sin Redis, toda ruta `/api/*` pasa a `503`.
- Las credenciales iniciales deben gestionarse mediante el sistema de secretos del entorno.

Estos controles sanitizan nuevas entradas y salidas. No reescriben automáticamente los registros personales ya existentes: una anonimización histórica debe hacerse mediante un plan explícito de retención/copia de seguridad que indique qué campos conservar y cuáles borrar.
