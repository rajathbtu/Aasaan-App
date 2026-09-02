-- AlterTable
ALTER TABLE "public"."Service" ADD COLUMN "alias" TEXT[] DEFAULT ARRAY[]::TEXT[];
