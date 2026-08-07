-- Add icon and color to Service for UI rendering
ALTER TABLE "public"."Service"
ADD COLUMN "icon" TEXT NOT NULL DEFAULT '';

ALTER TABLE "public"."Service"
ADD COLUMN "color" TEXT NOT NULL DEFAULT '';
