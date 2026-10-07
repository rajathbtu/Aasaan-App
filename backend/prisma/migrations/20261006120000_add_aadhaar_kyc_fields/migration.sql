ALTER TABLE "User"
ADD COLUMN "aadhaar_kyc_data" TEXT,
ADD COLUMN "aadhaar_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "aadhaar_last4" TEXT;