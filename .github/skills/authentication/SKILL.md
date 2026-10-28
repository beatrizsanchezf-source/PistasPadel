---
name: authentication
description: 'Use when changing login, password hashes, sessions, roles, password reset tokens, Resend email, cookies, or account lockout behavior.'
---

# Autenticación y cuentas

## Cuándo usarla

- Login, logout, sesiones, cookies y autorización por rol.
- Crear o verificar hashes, compatibilidad de contraseñas heredadas o cambio de contraseña.
- Solicitar o confirmar un restablecimiento de contraseña y enviar correo con Resend.

## Procedimiento

1. Lee los endpoints y las pruebas actuales en `src/app/api/auth/` antes de modificar el flujo.
2. Mantén la lógica criptográfica en `src/lib/password.ts` y el envío en `src/lib/password-reset-email.ts`.
3. Nunca guardes ni registres contraseñas en claro. Los hashes nuevos usan PBKDF2-HMAC-SHA-256 con sal aleatoria y 600 000 iteraciones; la verificación heredada de bcrypt/scrypt se conserva para migrar al login correcto.
4. Los tokens de recuperación son aleatorios, de un solo uso, expiran a los 30 minutos y solo se persiste su hash SHA-256.
5. Conserva respuesta anti-enumeración, límite por cuenta y revocación de sesiones tras cambiar la contraseña.
6. `RESEND_API_KEY`, `MAIL_FROM` y `APP_URL` son configuración externa. No añadas valores secretos al repositorio.
7. Añade pruebas para éxito, expiración, reutilización, usuario inexistente y fallos del proveedor sin filtrar información.
8. Actualiza `docs/api.md`, `docs/user-manual.md` y `docs/security-and-testing.md` cuando cambie el flujo visible o sus requisitos.

## Seguridad de sesión

- La base de datos almacena el hash del token de sesión, no el token original.
- La cookie es `HttpOnly` y `SameSite=Strict`; el atributo `Secure` se habilita en producción bajo HTTPS.
- La autorización se comprueba en el servidor, no se confía en el rol enviado por el navegador.