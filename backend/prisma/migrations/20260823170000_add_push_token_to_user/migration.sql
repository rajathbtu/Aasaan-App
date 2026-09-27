ALTER TABLE "User" ADD COLUMN "pushToken" TEXT;
ALTER TABLE "User" ADD COLUMN "pushTokenPlatform" TEXT;
ALTER TABLE "User" ADD COLUMN "pushTokenUpdatedAt" TIMESTAMP(3);