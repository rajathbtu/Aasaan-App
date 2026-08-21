-- Add indexes used by the provider work-request list query.
CREATE INDEX "WorkRequest_status_service_createdAt_idx"
ON "public"."WorkRequest"("status", "service", "createdAt");

-- Prevent duplicate acceptance records for the same provider and request.
CREATE UNIQUE INDEX "AcceptedProvider_providerId_workRequestId_key"
ON "public"."AcceptedProvider"("providerId", "workRequestId");
