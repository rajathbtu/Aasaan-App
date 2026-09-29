ALTER TABLE "public"."Rating"
ADD COLUMN "submittedByUserId" TEXT;

UPDATE "public"."Rating" AS rating
SET "submittedByUserId" = request."userId"
FROM "public"."WorkRequest" AS request
WHERE request."id" = rating."workRequestId";

ALTER TABLE "public"."Rating"
ALTER COLUMN "submittedByUserId" SET NOT NULL;

ALTER TABLE "public"."Rating"
ADD CONSTRAINT "Rating_submittedByUserId_fkey"
FOREIGN KEY ("submittedByUserId") REFERENCES "public"."User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
