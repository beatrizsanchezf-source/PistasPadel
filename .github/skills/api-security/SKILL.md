---
name: api-security
description: 'Use when adding or modifying Next.js API routes, authorization, input validation, HTTP errors, security headers, logging, rate limits, Redis, or SSRF protections.'
---

# API y seguridad

## Cuándo usarla

- Crear o editar Route Handlers bajo `src/app/api/`.
- Cambiar autenticación/autorización, validación de entradas, errores, logs, cabeceras o rate limits.
- Revisar llamadas HTTP externas o configuración Redis/Upstash.

## Procedimiento

1. Trata la ruta como adaptador HTTP; delega reglas con persistencia a casos de uso en `src/lib/`.
2. Comprueba sesión y rol en el servidor en cada operación protegida. La UI nunca sustituye la autorización del endpoint.
3. Lee JSON con `readJson` de `@/lib/http`; valida el resultado y devuelve el status HTTP adecuado.
4. No registres cuerpos, contraseñas, tokens, emails de recuperación ni excepciones completas. Usa `logSanitizedError`.
5. Mantén las respuestas de recuperación resistentes a enumeración de cuentas.
6. Añade pruebas de ruta para accesos permitidos y denegados, entradas inválidas y errores relevantes.
7. Actualiza `docs/api.md` y `docs/security-and-testing.md` cuando cambie el contrato o una política.

## Rate limit actual

- Ventana fija de 60 segundos por IP: API general 60; login 10; solicitud y confirmación de recuperación 5 combinadas.
- Límite adicional de login: 5 fallos por email normalizado cada 15 minutos.
- Recuperación: una solicitud por cuenta cada 60 segundos.
- Desarrollo mantiene contadores en memoria del proceso; producción requiere Upstash Redis y falla cerrado con `503` si no está disponible.
- La IP procede de `TRUSTED_CLIENT_IP_HEADER` (por defecto `x-real-ip`). El proxy perimetral debe sobrescribir esa cabecera.
- `src/lib/upstash-url.ts` restringe el destino Redis a HTTPS bajo `*.upstash.io`. Conserva esa validación ante cambios de configuración.

## Entradas y privacidad

- `readJson` limita el cuerpo a 64 KiB, exige `application/json` y UTF-8 válido.
- Normaliza y valida datos con `src/lib/user-validation.ts`; evita controles y caracteres bidi donde aplique.
- No expongas IDs ni datos privados de reservas de otros clientes en respuestas de agenda.