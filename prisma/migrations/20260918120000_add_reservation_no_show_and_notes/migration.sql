ALTER TYPE "ReservationStatus" ADD VALUE 'NO_SHOW';

ALTER TABLE "Reservation" ADD COLUMN "notes" TEXT;

CREATE TABLE "LoginAttempt" (
    "email" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("email")
);
