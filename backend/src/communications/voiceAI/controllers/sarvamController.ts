import { Request, Response } from 'express';
import sarvamService from '../services/sarvamService';
import { sarvamCallSessionManager } from '../models/sarvamCallSessions';
import { handleServiceProviderMissedCall } from '../../service';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

// In-memory map to track outbound attempt_id -> called number
// This is needed because outbound completion webhook doesn't include user_phone_number
const outboundAttemptMap = new Map<string, string>();

export function setOutboundAttempt(attemptId: string, phoneNumber: string) {
  outboundAttemptMap.set(attemptId, phoneNumber);
  // Cleanup after 1 hour
  setTimeout(() => outboundAttemptMap.delete(attemptId), 60 * 60 * 1000);
}

export function getOutboundAttempt(attemptId: string): string | undefined {
  return outboundAttemptMap.get(attemptId);
}

// Answer webhook: Sarvam will request this when a call is answered. Return a
// simple JSON instructing Sarvam to open a bidirectional stream to our WS
// endpoint. Adjust the shape to match Sarvam's expected response format.
export async function answer(req: Request, res: Response) {
  try {
    // Extract call info from Sarvam webhook payload
    const body = req.body || {};
    const callId = body.call_id || body.callId || body.CallUUID || body.call_uuid || `sarvam-${Date.now()}`;
    const from = body.from || body.From || body.caller_id || body.callerId;
    const to = body.to || body.To || body.called_number || body.calledNumber;
    const direction = body.direction || body.Direction || 'inbound';

    // Create or update session record
    const existingSession = sarvamCallSessionManager.get(callId);
    if (!existingSession) {
      sarvamCallSessionManager.create({
        callId,
        from,
        to,
        direction,
        createdAt: new Date(),
        status: 'ringing',
        metadata: body,
      });
      console.log('[SARVAM] answer: new session created', { callId, from, to, direction });
    } else {
      // Update existing session (in case of retry)
      sarvamCallSessionManager.update(callId, { 
        from: from || existingSession.from,
        to: to || existingSession.to,
        metadata: { ...existingSession.metadata, ...body },
      });
      console.log('[SARVAM] answer: session updated (retry?)', { callId, from, to });
    }

    const publicBase = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
    if (!publicBase) {
      console.error('[SARVAM] PUBLIC_BASE_URL not set; cannot construct Stream URL');
      return res.status(500).send('Server misconfigured');
    }

    const wsUrl = (process.env.PUBLIC_WS_URL || publicBase).replace(/\/$/, '') + '/ws/sarvam';

    // Sarvam's control schema may differ; here we send a JSON structure that
    // requests opening a websocket stream to our server. If Sarvam expects
    // XML or another payload, adjust accordingly.
    const responseBody = {
      action: 'stream',
      stream_url: wsUrl,
      content_type: process.env.SARVAM_STREAM_CONTENT_TYPE || 'audio/x-mulaw;rate=8000',
    };

    console.log('[SARVAM] Answering call', { callId, from, to, wsUrl });
    res.json(responseBody);
  } catch (err) {
    console.error('[SARVAM] answer error', err);
    res.status(500).send('Error');
  }
}

export async function hangup(req: Request, res: Response) {
  try {
    const body = req.body || {};

    // Log the raw payload keys for validation (no secrets)
    const payloadKeys = Object.keys(body);
    console.log('[SARVAM] hangup payload received', {
      keys: payloadKeys,
      hasInteractionId: 'interaction_id' in body,
      hasAttemptId: 'attempt_id' in body,
      hasUserPhone: 'user_phone_number' in body,
      hasAgentPhone: 'agent_phone_number' in body,
      hasDuration: 'duration' in body,
      hasTranscript: 'interaction_transcript' in body,
      hasStartDatetime: 'start_datetime' in body,
      hasEndDatetime: 'end_datetime' in body,
      hasStatus: 'status' in body,
      hasChannelInfo: 'channel_info' in body,
      // Log full payload in non-production for debugging
      ...(process.env.NODE_ENV !== 'production' && { body }),
    });

    // DETECT PAYLOAD TYPE: Inbound (deployment) vs Outbound (instant-outbound)
    const isOutbound = 'attempt_id' in body;
    const isInbound = 'interaction_id' in body;

    // Extract fields based on payload type
    let callId: string;
    let from: string | undefined;
    let to: string | undefined;
    let durationSec = 0;
    let endedAt: string | undefined;
    let startDatetime: string | undefined;
    let transcript: any = null;
    let status: string | undefined;
    let direction = isOutbound ? 'outbound' : 'inbound';

    if (isOutbound) {
      // OUTBOUND payload (instant-outbound completion webhook)
      callId = body.attempt_id;
      // Outbound webhook doesn't include user_phone_number - look up from our map
      from = getOutboundAttempt(body.attempt_id) || body.user_phone_number;
      to = body.channel_info?.agent_phone_number;
      durationSec = typeof body.duration === 'number' ? body.duration : 0;
      endedAt = body.end_datetime;
      startDatetime = body.start_datetime;
      transcript = body.interaction_transcript;
      status = body.status; // "failed", "completed", etc.
      
      console.log('[SARVAM] hangup: outbound payload detected', { 
        attemptId: body.attempt_id, 
        status, 
        duration: body.duration,
        mappedFrom: from 
      });
    } else if (isInbound) {
      // INBOUND payload (deployment completion webhook) - per documented schema
      callId = body.interaction_id;
      from = body.user_phone_number;
      to = body.agent_phone_number;
      durationSec = typeof body.duration === 'number' ? body.duration : 0;
      endedAt = body.end_datetime;
      startDatetime = body.start_datetime;
      transcript = body.interaction_transcript;
      // Inbound doesn't have status field
    } else {
      // Unknown payload type - try fallback extraction
      console.warn('[SARVAM] hangup: unknown payload type, attempting fallback', { payloadKeys });
      callId = body.interaction_id || body.attempt_id || body.call_id || body.callId || body.CallUUID || body.call_uuid || `sarvam-${Date.now()}`;
      from = body.user_phone_number || body.from || body.From || body.caller_id || body.callerId;
      to = body.agent_phone_number || body.to || body.To || body.called_number || body.calledNumber;
      durationSec = typeof body.duration === 'number' ? body.duration : 0;
      endedAt = body.end_datetime || body.ended_at || body.endedAt || body.end_time;
      startDatetime = body.start_datetime;
      transcript = body.interaction_transcript;
      status = body.status;
    }

    if (!callId) {
      console.warn('[SARVAM] hangup: missing call ID in payload', { payloadKeys });
      return res.status(200).send('OK'); // Still return 200 to avoid Sarvam retries
    }

    // Get or create session
    let session = sarvamCallSessionManager.get(callId);
    let isNewSession = false;
    if (!session) {
      // Session might not exist if answer webhook wasn't called (missed call before answer)
      session = sarvamCallSessionManager.create({
        callId,
        from,
        to,
        direction: String(direction),
        createdAt: startDatetime ? new Date(startDatetime) : new Date(),
        status: 'ended',
        durationSec,
        endedAt: endedAt ? new Date(endedAt) : new Date(),
        metadata: body,
      });
      isNewSession = true;
      console.log('[SARVAM] hangup: created session retroactively', { 
        callId, 
        from, 
        to,
        direction,
        durationSec, 
        transcriptLength: Array.isArray(transcript) ? transcript.length : 'missing/null',
        startDatetime,
        endDatetime: endedAt,
        status 
      });
    }

    // CLASSIFICATION LOGIC - runs for BOTH new and existing sessions
    const answeredAt = session.answeredAt || (startDatetime ? new Date(startDatetime) : new Date(session.createdAt.getTime() + 1000));
    const calculatedDurationRaw = durationSec > 0 ? durationSec : Math.round((endedAt ? new Date(endedAt).getTime() : Date.now()) - answeredAt.getTime()) / 1000;
    // Ensure duration is never negative (edge case when dates are null/missing)
    const calculatedDuration = Math.max(0, calculatedDurationRaw);

    // CLASSIFICATION LOGIC - differs for inbound vs outbound
    let isAnswered = false;
    let isMissedCandidate = false;
    let finalStatus: 'answered' | 'missed' | 'ended' = 'ended';

    if (isOutbound) {
      // OUTBOUND: Use status field (provided by Sarvam)
      // status can be: "completed" (answered), "failed" (not answered/busy/failed), "busy", "no-answer"
      const outboundStatus = status?.toLowerCase() || '';
      isAnswered = outboundStatus === 'completed';
      isMissedCandidate = !isAnswered && (outboundStatus === 'failed' || outboundStatus === 'busy' || outboundStatus === 'no-answer' || outboundStatus === 'missed');
      finalStatus = isAnswered ? 'answered' : (isMissedCandidate ? 'missed' : 'ended');
      
      console.log('[SARVAM] hangup: outbound classification', { 
        callId, 
        outboundStatus, 
        isAnswered, 
        isMissedCandidate, 
        finalStatus 
      });
    } else {
      // INBOUND: Use duration + transcript (no status field in inbound payload)
      const hasTranscript = Array.isArray(transcript) && transcript.length > 0;
      isAnswered = calculatedDuration > 0 && hasTranscript;
      isMissedCandidate = !isAnswered && calculatedDuration === 0 && !hasTranscript;
      finalStatus = isAnswered ? 'answered' : (isMissedCandidate ? 'missed' : 'ended');
    }
    
    // Update session with classification result
    session = sarvamCallSessionManager.update(callId, {
      from: from || session.from,
      to: to || session.to,
      durationSec: calculatedDuration,
      endedAt: endedAt ? new Date(endedAt) : new Date(),
      status: finalStatus,
      metadata: { ...session.metadata, ...body },
    });
    
    if (!session) {
      console.error('[SARVAM] hangup: session update returned undefined', { callId });
      return res.status(200).send('OK');
    }
    
    console.log('[SARVAM] hangup: session updated', { 
      callId, 
      from: session.from, 
      to: session.to,
      direction,
      durationSec: calculatedDuration, 
      status: finalStatus,
      transcriptLength: Array.isArray(transcript) ? transcript.length : 0,
      hasTranscript: Array.isArray(transcript) && transcript.length > 0,
      startDatetime,
      endDatetime: endedAt,
      rawStatus: status
    });

    // WhatsApp dispatch is performed after the call record is persisted below.
    // A missed outbound call is the only path that sends WhatsApp.

    // Persist call record to database (idempotent via interaction ID primary key)
    try {
      // Use Sarvam's interaction ID (or outbound attempt ID) as the record ID.
      const id = body.interaction_id ?? body.attempt_id;
      if (id) {
        // Keep the final agent output for downstream analytics and reporting.
        const outputAgentVariables = body.output_agent_variables ?? body.final_agent_variables ?? {};

        const userId = from
          ? (await prisma.user.findUnique({
              where: { phoneNumber: from },
              select: { id: true },
            }))?.id ?? null
          : null;

        const recordData: Prisma.VoiceCallRecordUncheckedCreateInput = {
          id,
          providerCallId: isOutbound ? body.attempt_id : undefined,
          callType: 'provider_onboarding',
          source: 'sarvam',
          userId,
          fromNumber: from,
          toNumber: to,
          status: finalStatus,
          durationSeconds: calculatedDuration > 0 ? calculatedDuration : null,
          startedAt: startDatetime ? new Date(startDatetime) : null,
          endedAt: endedAt ? new Date(endedAt) : new Date(),
          transcript: transcript && Array.isArray(transcript) && transcript.length > 0
            ? transcript
            : Prisma.JsonNull,
          inputAgentVariables: body.agent_variables ?? body.initial_agent_variables ?? Prisma.JsonNull,
          outputAgentVariables,
          extractionSchemaVersion: 1,
          rawWebhookPayload: body,
        };

        await prisma.voiceCallRecord.upsert({
          where: { id },
          create: recordData,
          update: {
            providerCallId: recordData.providerCallId,
            callType: recordData.callType,
            source: recordData.source,
            fromNumber: recordData.fromNumber,
            toNumber: recordData.toNumber,
            status: recordData.status,
            durationSeconds: recordData.durationSeconds,
            startedAt: recordData.startedAt,
            endedAt: recordData.endedAt,
            transcript: recordData.transcript,
            inputAgentVariables: recordData.inputAgentVariables,
            outputAgentVariables: recordData.outputAgentVariables,
            extractionSchemaVersion: recordData.extractionSchemaVersion,
            rawWebhookPayload: recordData.rawWebhookPayload,
          },
        });

        if (isOutbound && isMissedCandidate && session.from) {
          await triggerMissedCallWhatsApp(session);
        } else if (isOutbound && isAnswered) {
          console.log('[SARVAM] hangup: answered outbound call - skipping WhatsApp', { callId });
        } else if (!isOutbound) {
          console.log('[SARVAM] hangup: inbound call - WhatsApp disabled', { callId, finalStatus });
        } else {
          console.log('[SARVAM] hangup: indeterminate call - skipping WhatsApp', { callId, finalStatus });
        }

        console.log('[SARVAM] hangup: call record persisted to database', {
          id,
          status: finalStatus,
        });
      }
    } catch (dbErr: any) {
      // Don't fail the webhook if DB persistence fails - log and continue
      console.error('[SARVAM] hangup: database persistence failed', {
        error: dbErr?.message || String(dbErr),
        id: body.interaction_id ?? body.attempt_id
      });
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[SARVAM] hangup error', err);
    res.status(500).send('Error');
  }
}

async function triggerMissedCallWhatsApp(session: any) {
  const callId = session.callId;
  const callerNumber = session.from;

  if (!callerNumber) {
    console.warn('[SARVAM] Missed call WhatsApp trigger skipped: missing caller number', { callId });
    return;
  }

  if (session.whatsappTriggered) {
    console.log('[SARVAM] Missed call WhatsApp already triggered; skipping duplicate', { callId });
    return;
  }

  try {
    console.log('[SARVAM] Triggering missed call WhatsApp', {
      callId,
      callerNumber,
    });

    // Existing independently working missed-call flow. It uses the approved
    // sp_onboarding_missedcall_hindi template for new providers.
    await handleServiceProviderMissedCall(callerNumber);

    // Preserve the original in-memory idempotency behavior.
    sarvamCallSessionManager.update(callId, {
      whatsappTriggered: true,
      whatsappTriggeredAt: new Date(),
    });

    console.log('[SARVAM] Missed call WhatsApp flow completed', { callId });
  } catch (err: any) {
    console.error('[SARVAM] Missed call WhatsApp trigger failed', {
      callId,
      callerNumber,
      error: err?.message || String(err),
      status: err?.status,
      details: err?.details,
    });
    // Do not mark the session as triggered on failure.
  }
}

/**
 * Production Outbound Call API - Uses Sarvam Official REST API
 * 
 * NO CAMPAIGN REQUIRED - Uses Instant Outbound Call endpoint
 * NO OTP REQUIRED - Direct programmatic call
 * NO MCP REQUIRED - Uses official REST API
 * 
 * Endpoint: POST https://apps.sarvam.ai/api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds
 * Auth: X-API-Key header
 */
export async function createCall(req: Request, res: Response) {
  try {
    const to = req.body && req.body.to;
    if (!to) return res.status(400).json({ 
      success: false, 
      message: 'Missing "to" phone number' 
    });

    const result = await sarvamService.makeCall({ to });
    
    // Store attempt_id -> phone mapping for webhook correlation
    if (result.success && result.attempt_id) {
      setOutboundAttempt(result.attempt_id, to);
      console.log('[SARVAM] Stored outbound attempt mapping', { attempt_id: result.attempt_id, to });
    }
    
    res.json(result);
  } catch (err: any) {
    console.error('[SARVAM] createCall error', err && err.message ? err.message : err);
    res.status(500).json({ 
      success: false, 
      error: err && err.message ? err.message : String(err) 
    });
  }
}

export async function createTestCall(req: Request, res: Response) {
  try {
    const to = req.body && req.body.to;
    if (!to) return res.status(400).json({ message: 'Missing "to" phone number' });

    res.json({
      message: 'Test calls require phone number verification via Sarvam MCP tools',
      instructions: {
        step1: 'Verify the phone number using the verify_phone_number MCP tool',
        step2: 'Use the place_test_call MCP tool with the verified number',
        note: 'Maximum 10 numbers per test call'
      },
      requested_number: to
    });
  } catch (err: any) {
    console.error('[SARVAM] createTestCall error', err && err.message ? err.message : err);
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
}

/**
 * Get campaign status
 */
export async function getCampaignStatus(req: Request, res: Response) {
  try {
    const campaignId = process.env.SARVAM_CAMPAIGN_ID || 'Aasaan-Outb-d2a21081-84fd';
    res.json({
      campaign_id: campaignId,
      status: 'active',
      schedule: '24/7 (00:00-23:59 daily)',
      from_number: '+918064261388',
      agent: 'Aasaan Priya (v3 - Hindi)',
      how_to_call: 'POST /api/sarvam/calls with { "to": "+91XXXXXXXXXX" }',
      dashboard: 'https://dashboard.sarvam.ai'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export default { answer, hangup, createCall, createTestCall, getCampaignStatus };
