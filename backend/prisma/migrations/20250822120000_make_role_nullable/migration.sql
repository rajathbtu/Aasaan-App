-- Make User.role nullable to match Prisma schema and app logic
ALTER TABLE "public"."User"
ALTER COLUMN "role" DROP NOT NULL;
