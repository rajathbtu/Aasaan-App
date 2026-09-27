-- Speed up the end-user work-request list ordered by creation time.
CREATE INDEX "WorkRequest_userId_createdAt_idx"
ON "public"."WorkRequest"("userId", "createdAt");