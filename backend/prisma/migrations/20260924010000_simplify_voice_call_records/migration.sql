-- Simplify VoiceCallRecord and use the Sarvam interaction/attempt ID as the primary key.

-- Remove the old generated UUID primary key before promoting interaction_id.
ALTER TABLE "voice_call_records"
  DROP CONSTRAINT "voice_call_records_pkey";

DROP INDEX IF EXISTS "voice_call_records_interaction_id_key";

ALTER TABLE "voice_call_records"
  DROP COLUMN "id";

ALTER TABLE "voice_call_records"
  RENAME COLUMN "interaction_id" TO "id";

ALTER TABLE "voice_call_records"
  ALTER COLUMN "id" SET NOT NULL;

ALTER TABLE "voice_call_records"
  ADD CONSTRAINT "voice_call_records_pkey" PRIMARY KEY ("id");

-- Store the input variables separately from the final agent output.
ALTER TABLE "voice_call_records"
  RENAME COLUMN "agent_variables" TO "input_agent_variables";

-- These fields belonged to the removed extraction workflow.
ALTER TABLE "voice_call_records"
  DROP COLUMN "extracted_data",
  DROP COLUMN "extraction_status",
  DROP COLUMN "processing_error";

DROP INDEX IF EXISTS "voice_call_records_extraction_status_idx";

-- Support filtering call history by user.
CREATE INDEX "voice_call_records_user_id_idx"
  ON "voice_call_records" ("user_id");
