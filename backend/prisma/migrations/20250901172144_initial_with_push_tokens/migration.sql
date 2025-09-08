/*
  Warnings:

  - The `status` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `Payment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."DevicePlatform" AS ENUM ('ios', 'android');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('created', 'authorized', 'captured', 'failed', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "public"."PaymentType" AS ENUM ('boost', 'subscription', 'credit_purchase');

-- AlterTable
ALTER TABLE "public"."Payment" DROP COLUMN "status",
ADD COLUMN     "status" "public"."PaymentStatus" NOT NULL DEFAULT 'created',
DROP COLUMN "type",
ADD COLUMN     "type" "public"."PaymentType" NOT NULL;

-- AlterTable
ALTER TABLE "public"."Service" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "public"."PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "public"."DevicePlatform" NOT NULL,
    "deviceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "public"."PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_userId_idx" ON "public"."PushToken"("userId");

-- CreateIndex
CREATE INDEX "PushToken_platform_idx" ON "public"."PushToken"("platform");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "public"."Payment"("type");

-- AddForeignKey
ALTER TABLE "public"."PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
