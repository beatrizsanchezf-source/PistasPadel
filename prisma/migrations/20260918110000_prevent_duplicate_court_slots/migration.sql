CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Preserve the oldest active booking and release later historical conflicts before
-- enforcing the invariant on installations created before this constraint existed.
UPDATE "Reservation" AS duplicate
SET "status" = 'CANCELLED'
WHERE duplicate."status" <> 'CANCELLED'
  AND EXISTS (
    SELECT 1 FROM "Reservation" AS original
    WHERE original."courtId" = duplicate."courtId"
      AND original."status" <> 'CANCELLED'
      AND original."startsAt" < duplicate."endsAt"
      AND original."endsAt" > duplicate."startsAt"
      AND (original."createdAt", original."id") < (duplicate."createdAt", duplicate."id")
  );

ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_ends_after_starts"
  CHECK ("endsAt" > "startsAt");

ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_active_court_no_overlap"
  EXCLUDE USING gist (
    "courtId" WITH =,
    tsrange("startsAt", "endsAt", '[)') WITH &&
  ) WHERE ("status" <> 'CANCELLED');
