-- Add fields required by the current Service model.
ALTER TABLE "public"."Service" ADD COLUMN "icon" TEXT;
ALTER TABLE "public"."Service" ADD COLUMN "color" TEXT;

-- Preserve any existing services while making the new fields required.
UPDATE "public"."Service"
SET "icon" = 'construct', "color" = '#4CAF50'
WHERE "icon" IS NULL OR "color" IS NULL;

ALTER TABLE "public"."Service" ALTER COLUMN "icon" SET NOT NULL;
ALTER TABLE "public"."Service" ALTER COLUMN "color" SET NOT NULL;
