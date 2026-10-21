# Seguridad y pruebas

## Seguridad

- Las contraseñas nuevas se almacenan con PBKDF2-HMAC-SHA-256, sal aleatoria de 16 bytes y 600 000 iteraciones. Los hashes heredados de `bcrypt` y `scrypt` se verifican durante la transición y se convierten a PBKDF2 tras un inicio de sesión correcto.
- Nunca se devuelve `passwordHash` en las respuestas de usuario.
- La cookie de sesión es `HttpOnly`, `SameSite=Strict` y `Secure` en producción.
- La recuperación utiliza tokens aleatorios de un solo uso, guarda únicamente el hash del token, caduca a los 30 minutos y revoca las sesiones tras cambiar la contraseña. El envío requiere `APP_URL`, `RESEND_API_KEY` y un `MAIL_FROM` verificado por Resend.
- PostgreSQL almacena el hash del token de sesión.
- Las rutas comprueban autenticación y rol en el servidor.
- El límite de intentos fallidos usa `LoginAttempt`; en varias instancias debe sustituirse por un mecanismo compartido o rate limiting externo.
- La API limita a 60 peticiones por minuto y por IP mediante `src/proxy.ts`; al superar el límite devuelve `429` con `Retry-After` y cabeceras `X-RateLimit-*`.
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

- Las pruebas de rutas aíslan Prisma con mocks; todavía no prueban las migraciones y consultas reales mediante una base PostgreSQL desechable.
- El E2E usa respuestas API simuladas para ser determinista; conviene añadir un recorrido complementario contra PostgreSQL de pruebas.
- El rate limiting debe externalizarse en un despliegue horizontal.
- Las credenciales iniciales deben gestionarse mediante el sistema de secretos del entorno.
