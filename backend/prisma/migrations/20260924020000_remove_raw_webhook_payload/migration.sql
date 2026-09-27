-- The normalized VoiceCallRecord fields are sufficient for call history.
ALTER TABLE "voice_call_records"
  DROP COLUMN "raw_webhook_payload";
