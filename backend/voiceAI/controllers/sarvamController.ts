import { Request, Response } from 'express';
import sarvamService from '../services/sarvamService';

// Answer webhook: Sarvam will request this when a call is answered. Return a
// simple JSON instructing Sarvam to open a bidirectional stream to our WS
// endpoint. Adjust the shape to match Sarvam's expected response format.
export async function answer(req: Request, res: Response) {
  try {
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

    console.log('[SARVAM] Answering call', { wsUrl });
    res.json(responseBody);
  } catch (err) {
    console.error('[SARVAM] answer error', err);
    res.status(500).send('Error');
  }
}

export async function hangup(req: Request, res: Response) {
  try {
    console.log('[SARVAM] hangup callback', { params: Object.keys(req.body || {}) });
    res.status(200).send('OK');
  } catch (err) {
    console.error('[SARVAM] hangup error', err);
    res.status(500).send('Error');
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
