-- CreateTable
CREATE TABLE "public"."voice_call_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interaction_id" TEXT NOT NULL,
    "provider_call_id" TEXT,
    "call_type" TEXT NOT NULL DEFAULT 'provider_onboarding',
    "source" TEXT NOT NULL DEFAULT 'sarvam',
    "user_id" UUID,
    "from_number" TEXT,
    "to_number" TEXT,
    "status" TEXT NOT NULL,
    "duration_seconds" DECIMAL(10,2),
    "started_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "transcript" JSONB,
    "agent_variables" JSONB,
    "output_agent_variables" JSONB,
    "extracted_data" JSONB,
    "extraction_schema_version" INTEGER NOT NULL DEFAULT 1,
    "raw_webhook_payload" JSONB,
    "extraction_status" TEXT NOT NULL DEFAULT 'pending',
    "processing_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_call_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "voice_call_records_interaction_id_key" ON "public"."voice_call_records"("interaction_id");

-- CreateIndex
CREATE INDEX "voice_call_records_call_type_idx" ON "public"."voice_call_records"("call_type");

-- CreateIndex
CREATE INDEX "voice_call_records_status_idx" ON "public"."voice_call_records"("status");

-- CreateIndex
CREATE INDEX "voice_call_records_from_number_idx" ON "public"."voice_call_records"("from_number");

-- CreateIndex
CREATE INDEX "voice_call_records_to_number_idx" ON "public"."voice_call_records"("to_number");

-- CreateIndex
CREATE INDEX "voice_call_records_started_at_idx" ON "public"."voice_call_records"("started_at");

-- CreateIndex
CREATE INDEX "voice_call_records_extraction_status_idx" ON "public"."voice_call_records"("extraction_status");