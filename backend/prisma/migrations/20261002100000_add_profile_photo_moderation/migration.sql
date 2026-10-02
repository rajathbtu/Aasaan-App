CREATE TYPE "pic_moderation_status" AS ENUM ('under_review', 'approved', 'blocked');

ALTER TABLE "public"."User"
ADD COLUMN "avatarImageKitFileId" TEXT,
ADD COLUMN "pic_moderation" "pic_moderation_status" NOT NULL DEFAULT 'approved';