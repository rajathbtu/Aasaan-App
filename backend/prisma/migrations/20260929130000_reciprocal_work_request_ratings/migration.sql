ALTER TABLE "public"."User"
ADD COLUMN "ratingsScoreSum" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ratingsCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "public"."WorkRequest"
ADD COLUMN "selectedProviderId" TEXT;

ALTER TABLE "public"."Rating"
ADD COLUMN "ratedUserId" TEXT;

UPDATE "public"."Rating"
SET "ratedUserId" = "providerId";

UPDATE "public"."WorkRequest" AS request
SET "selectedProviderId" = rating."providerId"
FROM "public"."Rating" AS rating
WHERE rating."workRequestId" = request."id";

UPDATE "public"."User" AS user_record
SET "ratingsScoreSum" = rating_totals.score_sum,
    "ratingsCount" = rating_totals.rating_count
FROM (
  SELECT "ratedUserId",
         SUM("stars")::INTEGER AS score_sum,
         COUNT(*)::INTEGER AS rating_count
  FROM "public"."Rating"
  GROUP BY "ratedUserId"
) AS rating_totals
WHERE user_record."id" = rating_totals."ratedUserId";

ALTER TABLE "public"."Rating"
ALTER COLUMN "ratedUserId" SET NOT NULL;

DROP INDEX "public"."Rating_workRequestId_key";

ALTER TABLE "public"."Rating"
DROP COLUMN "providerId";

CREATE UNIQUE INDEX "Rating_workRequestId_submittedByUserId_key"
ON "public"."Rating"("workRequestId", "submittedByUserId");

CREATE INDEX "Rating_ratedUserId_idx"
ON "public"."Rating"("ratedUserId");

CREATE INDEX "AcceptedProvider_workRequestId_idx"
ON "public"."AcceptedProvider"("workRequestId");

CREATE INDEX "WorkRequest_selectedProviderId_status_closedAt_idx"
ON "public"."WorkRequest"("selectedProviderId", "status", "closedAt");

ALTER TABLE "public"."Rating"
ADD CONSTRAINT "Rating_ratedUserId_fkey"
FOREIGN KEY ("ratedUserId") REFERENCES "public"."User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."WorkRequest"
ADD CONSTRAINT "WorkRequest_selectedProviderId_fkey"
FOREIGN KEY ("selectedProviderId") REFERENCES "public"."User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;