# Despliegue de producción

Guía para desplegar Pistas Padel como aplicación Node.js/Next.js con PostgreSQL, Upstash Redis y, si se habilita el restablecimiento de contraseña, Resend. Está escrita para un servidor o plataforma Node.js administrada; el repositorio no incluye una imagen Docker de la aplicación. `compose.yaml` solo sirve para levantar PostgreSQL localmente.

## Estado y bloqueos previos

Antes de ofrecer el servicio a usuarios reales, resuelve y prueba cómo se creará la primera cuenta administradora. En el código actual:

- `GET /api/users/first` está retirado y devuelve `410 Gone`.
- `npm run db:seed` rechaza `NODE_ENV=production` y crea datos de demostración.
- `POST /api/users` requiere una sesión de administrador.

Por tanto, el repositorio no proporciona un procedimiento soportado de bootstrap del primer administrador en producción. No habilites la semilla, no expongas la base de datos ni insertes una contraseña en claro para sortearlo. Antes del go-live, prepara y revisa un procedimiento único que genere el hash con el código de autenticación del proyecto, cree la cuenta con privilegios mínimos y no deje credenciales temporales; documenta quién lo ejecuta y cómo se verifica. Si ese procedimiento no existe, el despliegue no está listo para aceptar usuarios.

## Arquitectura de despliegue

```text
Navegador
  -> DNS y HTTPS en proxy inverso / balanceador
  -> Next.js (Node.js, puerto interno 3000)
  -> PostgreSQL privado
  -> Upstash Redis REST por HTTPS (rate limits compartidos)
  -> Resend API por HTTPS (correo de restablecimiento, opcional)
```

Termina TLS en el proxy o en la plataforma. No expongas directamente PostgreSQL, Redis ni el puerto interno de Next.js a Internet. Para varias instancias de Next.js, todas deben usar la misma base PostgreSQL, el mismo Upstash y la misma configuración de IP confiable.

## Requisitos

| Recurso | Requisito |
| --- | --- |
| Node.js | Node 22.x, la versión usada en CI; conserva una versión LTS compatible con Next.js 16. |
| npm | npm incluido con la instalación de Node; usa `npm ci` para respetar `package-lock.json`. |
| PostgreSQL | PostgreSQL 16 es la versión usada en Compose y CI. Usa una base dedicada, con TLS y acceso de red limitado a la aplicación y al job de migración. |
| Extensión PostgreSQL | El usuario de migraciones debe poder habilitar `btree_gist`, requerida por la restricción de exclusión de reservas. Confirma que el proveedor la ofrece y permite crearla antes del despliegue. |
| Upstash Redis REST | Obligatorio en producción para limitar peticiones entre procesos. La URL debe ser HTTPS y tener un host bajo `*.upstash.io`; sin ruta, query, credenciales ni puerto personalizado. |
| Dominio y TLS | Dominio público, certificado TLS válido y proxy configurado para reenviar la IP cliente de forma confiable. |
| Resend | Solo si se habilita el restablecimiento de contraseña: cuenta, API key y remitente/dominio verificado. |
| Proceso de servicio | Supervisor de procesos o runtime administrado para arrancar `npm run start`, reiniciarlo ante fallos y guardar logs. |

## Variables de entorno

Configúralas en el gestor de secretos de la plataforma, no en Git ni en una imagen pública. `.env.example` es solo una plantilla local.

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Sí | PostgreSQL para la aplicación, Prisma CLI, migraciones y limpieza. Incluye los parámetros TLS requeridos por el proveedor; codifica caracteres especiales de usuario/contraseña como URL. |
| `UPSTASH_REDIS_REST_URL` | Sí en producción | URL REST de Upstash. El código acepta únicamente HTTPS bajo `*.upstash.io`, con origen sin ruta adicional, query ni fragmento. |
| `UPSTASH_REDIS_REST_TOKEN` | Sí en producción | Token secreto de Upstash. No lo registres ni lo incluyas en imágenes o artefactos. |
| `TRUSTED_CLIENT_IP_HEADER` | Recomendado | Cabecera que escribe el proxy con la IP del cliente. Por defecto es `x-real-ip`. El proxy debe sobrescribirla; no confíes en valores enviados directamente por Internet. |
| `APP_URL` | Para restablecimiento de contraseña | URL pública canónica, por ejemplo `https://padel.example.com`. En producción debe usar HTTPS; se usa para formar el enlace enviado por correo. |
| `RESEND_API_KEY` | Para restablecimiento de contraseña | API key de Resend. |
| `MAIL_FROM` | Para restablecimiento de contraseña | Remitente verificado en Resend, por ejemplo `Pistas Pádel <no-reply@tu-dominio.es>`. |
| `NODE_ENV` | Sí | Establécela en `production` en el proceso desplegado. Habilita cookie segura y controles de producción; el endpoint de salud también exige Redis. |
| `PORT` | No | Puerto interno de Next.js; el valor predeterminado es `3000`. Configura el proxy para usar el mismo valor. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | No en runtime | Solo para la semilla de desarrollo. No constituyen un mecanismo de bootstrap productivo; no ejecutes la semilla en producción. |

El proceso de producción responde `503` en `/api/*` si Upstash falta, su URL no pasa la validación o Redis no está disponible. Esta respuesta es intencional: no desactives el rate limit como solución.

## Preparación de infraestructura

1. Crea una base de datos y un usuario de aplicación dedicados. No reutilices credenciales de administrador de PostgreSQL para el runtime.
2. Limita la conexión entrante de PostgreSQL a los hosts de aplicación y al runner de migraciones. Activa TLS según los requisitos del proveedor.
3. Confirma que `btree_gist` está disponible para el usuario de migración. La restricción GiST evita reservas activas solapadas.
4. Crea la instancia Upstash y copia su URL REST y token en el gestor de secretos.
5. Configura DNS y TLS para el dominio. Define `APP_URL` con la URL HTTPS que verán los usuarios.
6. Configura Resend y verifica el dominio/remitente antes de anunciar el restablecimiento de contraseña.
7. Configura firewall y red privada: público solo el proxy HTTPS; PostgreSQL, Redis y el puerto de Node no deben aceptar conexiones públicas directas.
8. Configura almacenamiento y política de copias de seguridad de PostgreSQL. Revisa [Operación y recuperación](operations.md) para copia y ensayo de restauración.

## Release de la aplicación

### Validación antes de publicar

Usa una rama/tag versionado y exige que CI termine correctamente. El workflow actual comprueba instalación reproducible, generación Prisma, migraciones e integración PostgreSQL, lint, pruebas unitarias, compilación y E2E.

La prueba de integración requiere una base PostgreSQL desechable; nunca apuntes `test:integration` a producción. Para E2E, Playwright crea HTTPS local y utiliza datos simulados.

### Construcción

En un runner Linux o servidor con Node 22 y acceso al release:

```bash
npm ci
npm run db:generate
npm run lint
npm test
npm run build
```

`prisma.config.ts` lee `DATABASE_URL` al ejecutar Prisma CLI. Para generar el cliente en CI, proporciona una URL válida disponible en el entorno de build; la generación no debe usar credenciales de producción si el runner no necesita acceso a la base productiva. Conserva el artefacto de build asociado al commit desplegado.

El proyecto utiliza `next start`; no tiene `output: "standalone"` configurado. Si la plataforma compila en CI, asegúrate de desplegar el build de Next.js, `node_modules` de producción, `package.json`, los archivos necesarios del proyecto y las variables runtime compatibles. No copies certificados locales de desarrollo: producción termina TLS en el proxy.

### Migraciones y activación

Haz una copia de seguridad antes de modificar el esquema. Ejecuta las migraciones **una vez por release**, desde un runner controlado y con `DATABASE_URL` de producción:

```bash
npm run db:deploy
```

No ejecutes `npm run db:migrate` en producción: es el flujo de desarrollo y puede necesitar una base sombra. No ejecutes `npm run db:seed`.

Revisa cada migración antes de aplicarla. En particular, `20260918110000_prevent_duplicate_court_slots` crea `btree_gist` y marca como `CANCELLED` reservas activas solapadas preexistentes, conservando la más antigua según fecha de creación e ID. Audita previamente los registros afectados y comunica el impacto antes de aplicar esta migración a una base que ya contenga reservas.

Cuando la migración termine correctamente, arranca o actualiza el proceso:

```bash
NODE_ENV=production npm run start
```

El supervisor debe inyectar las variables sin escribir secretos en la línea de comandos o en logs. En una plataforma administrada configura `npm run start` como comando de arranque y el puerto interno configurado en `PORT`.

## Proxy inverso y HTTPS

Ejemplo orientativo para Nginx. Ajusta certificados, nombre de dominio y políticas de TLS a la plataforma:

```nginx
server {
    listen 443 ssl;
    server_name padel.example.com;

    ssl_certificate     /etc/letsencrypt/live/padel.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/padel.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

El ajuste esencial de rate limit es que el proxy perimetral sobrescriba `X-Real-IP` (o la cabecera elegida por `TRUSTED_CLIENT_IP_HEADER`). No expongas el puerto de Next.js para que clientes externos puedan falsificar esa cabecera. Si hay más de un proxy, define y prueba explícitamente qué salto se considera confiable.

La aplicación envía HSTS en producción. Habilita el sitio únicamente después de verificar que todo el tráfico público usa HTTPS. No añadas `includeSubDomains` o `preload` sin confirmar que todos los subdominios cumplen TLS.

## Servicio persistente en Linux

Ejemplo de unidad systemd; sustituye rutas, usuario y ubicación de Node/npm por las del servidor. Protege el archivo de entorno con permisos de propietario únicamente.

```ini
[Unit]
Description=Pistas Padel Next.js
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pistas-padel
Group=pistas-padel
WorkingDirectory=/opt/pistas-padel/current
EnvironmentFile=/etc/pistas-padel/pistas-padel.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5
KillSignal=SIGTERM
TimeoutStopSec=30
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

El directorio `current` debe apuntar al release aprobado; el usuario del servicio necesita lectura del build y permisos solo donde sean necesarios. Mantén los logs en el journal o en un colector central. No guardes `.env` dentro del directorio público del sitio.

## Verificación posterior al despliegue

1. Comprueba desde Internet que DNS resuelve al proxy y que el certificado HTTPS corresponde al dominio.
2. Comprueba `GET https://padel.example.com/api/health`. Debe responder `200` con estado de base de datos y Redis correctos. Un `503` indica que PostgreSQL, Upstash o su configuración no está disponible.
3. Configura el chequeo de disponibilidad con intervalo moderado (por ejemplo, 30 segundos); `/api/health` pasa por el rate limit de API.
4. Comprueba una página de la aplicación y revisa las cabeceras CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y HSTS.
5. Verifica login con una cuenta de prueba controlada, cierre de sesión y autorización de endpoints; elimina datos de prueba al terminar.
6. Si el reset está habilitado, solicita un correo a una cuenta de prueba y confirma entrega, dominio remitente, enlace HTTPS y expiración. No uses cuentas de clientes para probar.
7. Revisa logs del servicio, proxy, PostgreSQL y Redis. No copies secretos, cuerpos de petición ni tokens a incidencias.
8. Confirma que las migraciones están aplicadas y que el job de limpieza está programado.

## Primer administrador

No continúes al go-live hasta tener el procedimiento de provisionamiento del primer administrador mencionado al principio de esta guía. Tras crearla:

- inicia sesión y confirma que su rol es `ADMIN`;
- comprueba que puede administrar usuarios y gestionar pistas;
- confirma que ninguna ruta permite crear otro administrador sin autorización;
- elimina cualquier credencial temporal, acceso de mantenimiento o mecanismo de bootstrap;
- guarda el procedimiento aprobado en el runbook operativo restringido, nunca secretos ni contraseñas.

## Rollback

1. Si falla la aplicación antes de migrar, restaura el release anterior y verifica `/api/health`.
2. Si ya se aplicó una migración, no reviertas automáticamente el esquema ni restaures sobre la base activa. Valora compatibilidad del código anterior, realiza copia nueva y sigue un plan explícito de recuperación.
3. Si la migración modificó reservas solapadas, la copia previa es la referencia para recuperar los estados originales; no marques reservas como confirmadas sin revisión del operador.
4. Mantén la base de datos y los artefactos de releases independientes para que volver atrás no borre reservas creadas después del despliegue.

## Operación continua

- Ejecuta diariamente `npm run db:cleanup-expired` con un scheduler, desde un entorno que use la versión desplegada y `DATABASE_URL`. El comando elimina sesiones expiradas, tokens de reset expirados e intentos de login vencidos.
- Programa copias cifradas de PostgreSQL, conserva retención definida y ensaya restauraciones en una base temporal. Sigue [Operación y recuperación](operations.md).
- Alerta sobre fallos de `/api/health`, errores `5xx`, aumentos anómalos de `429`, errores de Resend y fallos del job de limpieza.
- Actualiza dependencias con revisión y CI; despliega migraciones revisadas y un artefacto asociado a un commit.
- No ejecutes `migrate reset`, `db:seed` ni pruebas de integración contra producción.
- La iluminación persistente y las reservas se guardan en PostgreSQL; mantén capacidad, copias y alertas acordes al horario de uso del club.