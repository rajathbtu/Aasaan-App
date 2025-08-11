-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('endUser', 'serviceProvider');

-- CreateEnum
CREATE TYPE "public"."Plan" AS ENUM ('free', 'basic', 'pro');

-- CreateEnum
CREATE TYPE "public"."WorkRequestStatus" AS ENUM ('active', 'closed');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('newRequest', 'requestAccepted', 'ratingPrompt', 'boostPromotion', 'autoClosed', 'planPromotion');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "creditPoints" INTEGER NOT NULL DEFAULT 0,
    "plan" "public"."Plan" NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceProviderInfo" (
    "id" TEXT NOT NULL,
    "services" TEXT[],
    "locationId" TEXT,
    "radius" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ServiceProviderInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."WorkRequestStatus" NOT NULL DEFAULT 'active',
    "boosted" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "WorkRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AcceptedProvider" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workRequestId" TEXT NOT NULL,

    CONSTRAINT "AcceptedProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Rating" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "review" TEXT,
    "workRequestId" TEXT NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "public"."User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProviderInfo_locationId_key" ON "public"."ServiceProviderInfo"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProviderInfo_userId_key" ON "public"."ServiceProviderInfo"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkRequest_locationId_key" ON "public"."WorkRequest"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_workRequestId_key" ON "public"."Rating"("workRequestId");

-- AddForeignKey
ALTER TABLE "public"."ServiceProviderInfo" ADD CONSTRAINT "ServiceProviderInfo_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceProviderInfo" ADD CONSTRAINT "ServiceProviderInfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkRequest" ADD CONSTRAINT "WorkRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkRequest" ADD CONSTRAINT "WorkRequest_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AcceptedProvider" ADD CONSTRAINT "AcceptedProvider_workRequestId_fkey" FOREIGN KEY ("workRequestId") REFERENCES "public"."WorkRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Rating" ADD CONSTRAINT "Rating_workRequestId_fkey" FOREIGN KEY ("workRequestId") REFERENCES "public"."WorkRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
