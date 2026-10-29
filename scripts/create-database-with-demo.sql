-- Neon SQL Editor: selecciona primero el proyecto, branch y una base vacía.
-- Este archivo crea el esquema y los datos dentro de la base seleccionada;
-- no crea ni cambia de base de datos y no usa comandos propios de psql.
-- Requiere permiso para crear objetos y habilitar btree_gist.
-- Solo para desarrollo/pruebas. No ejecutar en producción.
-- Credenciales demo para todas las cuentas: PadelDemo2026!

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relkind IN ('r', 'p')
      AND relname IN ('User', 'Court', 'Reservation', 'Session', 'LoginAttempt', 'PasswordResetToken')
  ) THEN
    RAISE EXCEPTION 'La base ya contiene tablas de Pistas Padel; no se modificó ningún dato. Usa una base vacía.';
  END IF;
END
$$;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CUSTOMER');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "passwordHash" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Court" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "lightsOn" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Court_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Court_name_key" ON "Court"("name");

CREATE TABLE "Reservation" (
  "id" TEXT NOT NULL,
  "courtId" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "players" INTEGER NOT NULL DEFAULT 4,
  "withLight" BOOLEAN NOT NULL DEFAULT false,
  "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Reservation_ends_after_starts" CHECK ("endsAt" > "startsAt"),
  CONSTRAINT "Reservation_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Reservation_active_court_no_overlap"
    EXCLUDE USING gist (
      "courtId" WITH =,
      tsrange("startsAt", "endsAt", '[)') WITH &&
    ) WHERE ("status" <> 'CANCELLED')
);

CREATE INDEX "Reservation_courtId_startsAt_idx" ON "Reservation"("courtId", "startsAt");
CREATE INDEX "Reservation_userId_startsAt_idx" ON "Reservation"("userId", "startsAt");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE TABLE "LoginAttempt" (
  "email" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("email")
);

CREATE TABLE "PasswordResetToken" (
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("tokenHash"),
  CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

INSERT INTO "Court" ("id", "name", "description", "lightsOn") VALUES
  (1, 'Pista 1', 'Cubierta · Cristal', true),
  (2, 'Pista 2', 'Exterior · Panorámica', true),
  (3, 'Pista 3', 'Exterior · Estándar', false);

SELECT setval(pg_get_serial_sequence('"Court"', 'id'), (SELECT MAX("id") FROM "Court"));

INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role") VALUES
  ('demo_admin', 'Administración', 'admin@example.test', NULL, '$pbkdf2-sha256$600000$ABEiM0RVZneImaq7zN3u_w$gWTKUPrk5zBzTrx8DGAeusXWt6qR-l_2MD5A3llyRYE', 'ADMIN'),
  ('demo_maria', 'María García', 'maria@example.test', NULL, '$pbkdf2-sha256$600000$ABEiM0RVZneImaq7zN3u_w$gWTKUPrk5zBzTrx8DGAeusXWt6qR-l_2MD5A3llyRYE', 'CUSTOMER'),
  ('demo_pablo', 'Pablo Martín', 'pablo@example.test', NULL, '$pbkdf2-sha256$600000$ABEiM0RVZneImaq7zN3u_w$gWTKUPrk5zBzTrx8DGAeusXWt6qR-l_2MD5A3llyRYE', 'CUSTOMER'),
  ('demo_carlos', 'Carlos Rodríguez', 'carlos@example.test', NULL, '$pbkdf2-sha256$600000$ABEiM0RVZneImaq7zBzTrx8DGAeusXWt6qR-l_2MD5A3llyRYE', 'CUSTOMER');

WITH next_day AS (
  SELECT date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid') + INTERVAL '1 day' AS day
)
INSERT INTO "Reservation" ("id", "courtId", "userId", "startsAt", "endsAt", "players", "withLight", "status", "notes")
SELECT demo."id", court."id", demo."userId", next_day.day + demo."startOffset", next_day.day + demo."endOffset", demo."players", demo."withLight", demo."status"::"ReservationStatus", demo."notes"
FROM next_day
CROSS JOIN (VALUES
  ('demo_reservation_1', 'Pista 1', 'demo_maria', INTERVAL '17 hours', INTERVAL '18 hours', 4, false, 'CONFIRMED', NULL::TEXT),
  ('demo_reservation_2', 'Pista 1', 'demo_pablo', INTERVAL '19 hours', INTERVAL '20 hours', 4, true, 'CONFIRMED', NULL::TEXT),
  ('demo_reservation_3', 'Pista 2', 'demo_pablo', INTERVAL '18 hours', INTERVAL '19 hours', 2, true, 'PENDING', NULL::TEXT),
  ('demo_reservation_4', 'Pista 3', 'demo_carlos', INTERVAL '16 hours', INTERVAL '17 hours', 4, false, 'CONFIRMED', NULL::TEXT)
) AS demo("id", "courtName", "userId", "startOffset", "endOffset", "players", "withLight", "status", "notes")
JOIN "Court" AS court ON court."name" = demo."courtName"
;

-- Acceso administrador: admin@example.test / PadelDemo2026!
-- Clientes: maria@example.test, pablo@example.test, carlos@example.test
-- Contraseña para todas las cuentas: PadelDemo2026!
-- Cambia estas credenciales y no uses estos datos en producción.