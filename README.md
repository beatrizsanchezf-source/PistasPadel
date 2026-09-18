# Punto de Oro

Aplicación Next.js para administrar tres pistas de pádel, sus usuarios, reservas por día y el estado de iluminación.

## Base de datos

Necesitas una instancia de PostgreSQL. Copia `.env.example` como `.env` y adapta `DATABASE_URL` con las credenciales de tu servidor.

```powershell
Copy-Item .env.example .env
```

Después crea las tablas y carga datos iniciales:

```powershell
npm run db:migrate -- --name init
npm run db:seed
```

La semilla crea las tres pistas, tres usuarios y varias reservas para el día actual.

## Ejecutar

```powershell
npm run dev
```

Abre `http://localhost:3000`.

## Modelo

- `User`: nombre, correo y teléfono del cliente.
- `Court`: las tres pistas, sus características y si su luz está encendida.
- `Reservation`: usuario, pista, hora de inicio y fin, jugadores, estado y si solicita luz.

La agenda consulta `GET /api/schedule?date=AAAA-MM-DD` y los interruptores guardan la luz mediante `PATCH /api/courts/:courtId/lights`.
