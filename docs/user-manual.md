# Manual de usuario

## 1. Acceso

1. En desarrollo local, abre `https://localhost:3000` y acepta el aviso del certificado de desarrollo; en producción usa el dominio HTTPS indicado por el administrador.
2. Introduce tu correo electrónico y contraseña.
3. Pulsa **Entrar**.

Si las credenciales no son correctas, aparecerá un mensaje de error. Se permiten hasta cinco fallos por email dentro de una ventana de 15 minutos; después hay que esperar al reinicio de la ventana. También se limita el total de intentos por IP.

Las credenciales iniciales de desarrollo son las definidas mediante `ADMIN_EMAIL` y `ADMIN_PASSWORD` antes de ejecutar la semilla. No compartas estas credenciales ni las uses en producción.

### Restablecer contraseña

1. Pulsa **¿Has olvidado la contraseña?**.
2. Introduce el correo de tu cuenta y solicita el enlace.
3. Abre el enlace recibido antes de que pasen 30 minutos y establece una contraseña nueva de al menos 12 caracteres.

La solicitud muestra el mismo mensaje exista o no una cuenta para ese correo. En desarrollo y producción, el envío requiere configurar `APP_URL`, `RESEND_API_KEY` y un `MAIL_FROM` de un dominio verificado en Resend. `APP_URL` debe ser accesible desde el dispositivo que abre el correo; `localhost` solo sirve en el mismo equipo donde corre la aplicación.

## 2. Pantalla principal

Después de iniciar sesión se muestra:

- el saludo y el usuario activo;
- el resumen de ocupación del día;
- el número de reservas;
- las luces activas;
- el selector semanal de fechas;
- la agenda de las pistas;
- el estado de la iluminación.

La agenda muestra las reservas ordenadas por hora. Las reservas propias muestran sus datos; las reservas de otros usuarios aparecen como reservadas cuando la cuenta no tiene permisos de administración.

## 3. Consultar la agenda

1. Usa los botones de los días para seleccionar una fecha.
2. Pulsa **Hoy** para volver a la fecha actual.
3. Usa las flechas para avanzar o retroceder una semana.
4. Consulta cada pista y sus franjas horarias.

La aplicación trabaja con la zona horaria del club, `Europe/Madrid`.

## 4. Crear una reserva

1. Pulsa **Nueva reserva**.
2. Selecciona la pista, fecha, hora y número de jugadores.
3. Marca **Necesita iluminación** si corresponde.
4. Revisa los datos y pulsa **Crear reserva**.

Las reservas deben cumplir estas condiciones:

- la fecha y hora deben ser futuras;
- la hora debe estar en punto;
- el horario permitido está entre las 08:00 y las 21:00;
- el número de jugadores debe estar entre 1 y 4;
- no puede existir otra reserva activa solapada en la misma pista.

Los clientes crean sus propias reservas y estas quedan inicialmente pendientes. Los administradores pueden seleccionar otro cliente y establecer el estado permitido.

## 5. Funciones de administrador

Las cuentas con rol `ADMIN` disponen además de:

### Gestión de clientes

1. Pulsa **Clientes**.
2. Pulsa **Nuevo cliente** para crear una cuenta.
3. Introduce nombre, correo, teléfono opcional, contraseña y rol.
4. Pulsa **Dar de alta**.

Para modificar una cuenta, pulsa **Editar** junto al usuario. Puedes cambiar sus datos, rol o contraseña. Deja la contraseña vacía para conservar la actual.

La aplicación impide convertir en cliente al último administrador disponible.

### Modificar reservas

1. Pulsa una reserva desde la agenda.
2. Modifica los datos necesarios.
3. Pulsa **Guardar cambios**.

Después de la hora de inicio solo se pueden actualizar el estado y las observaciones.

Estados disponibles:

- **Pendiente**
- **Confirmada**
- **Cancelada**
- **No presentada**, cuando corresponda desde la gestión de la reserva.

### Controlar la iluminación

Puedes encender o apagar una pista desde:

- el interruptor de la fila de la pista en la agenda;
- el panel **Control de pistas**.

El cambio se guarda en la base de datos. Solo los administradores pueden realizarlo.

## 6. Cerrar sesión

Pulsa el botón de salida situado junto al nombre del usuario. La sesión se elimina y volverás a la pantalla de acceso.

## 7. Mensajes habituales

| Mensaje | Qué hacer |
| --- | --- |
| `Correo o contraseña incorrectos` | Comprueba las credenciales. |
| `Demasiados intentos` | Espera a que termine la ventana de bloqueo temporal. |
| `La pista ya tiene una reserva en ese horario` | Selecciona otra hora o pista. |
| `La reserva debe ser futura` | Elige una fecha y hora posteriores al momento actual. |
| `No autorizado` | Comprueba que tu cuenta tiene el rol necesario. |
| `No se pudo completar la solicitud` | Comprueba que el servidor y PostgreSQL están activos. |

## 8. Recomendaciones

- Cierra sesión al terminar en un equipo compartido.
- No compartas contraseñas.
- Comprueba la pista y la hora antes de confirmar una reserva.
- Los cambios de reservas y luces se guardan de forma persistente en PostgreSQL.
