-- Copy each request's location into immutable request-owned snapshot fields.
ALTER TABLE "public"."WorkRequest"
  ADD COLUMN "locationName" TEXT,
  ADD COLUMN "locationLat" DOUBLE PRECISION,
  ADD COLUMN "locationLng" DOUBLE PRECISION;

UPDATE "public"."WorkRequest" wr
SET
  "locationName" = loc."name",
  "locationLat" = loc."lat",
  "locationLng" = loc."lng"
FROM "public"."Location" loc
WHERE wr."locationId" = loc."id";

ALTER TABLE "public"."WorkRequest"
  ALTER COLUMN "locationName" SET NOT NULL,
  ALTER COLUMN "locationLat" SET NOT NULL,
  ALTER COLUMN "locationLng" SET NOT NULL;

ALTER TABLE "public"."WorkRequest"
  DROP CONSTRAINT "WorkRequest_locationId_fkey";

DROP INDEX IF EXISTS "public"."WorkRequest_locationId_key";

ALTER TABLE "public"."WorkRequest"
  DROP COLUMN "locationId";

-- Request locations are no longer needed. Preserve locations still used by providers.
DELETE FROM "public"."Location" loc
WHERE NOT EXISTS (
  SELECT 1
  FROM "public"."ServiceProviderInfo" spi
  WHERE spi."locationId" = loc."id"
);
