/**
 * Sarvam Service for Outbound Calling - Using Official REST API
 * 
 * Uses Sarvam's official REST API endpoints (no MCP required):
 * - Instant Outbound Call: POST /api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds
 * - Campaigns: POST /api/scheduling/v1/orgs/{org_id}/workspaces/{workspace_id}/campaigns
 * - Cohort Upload: POST /api/scheduling/v1/orgs/{org_id}/workspaces/{workspace_id}/campaigns/{campaign_id}/cohorts/upload
 * 
 * Authentication: X-API-Key header
 * Base URL: https://apps.sarvam.ai
 */

const SARVAM_API_BASE = 'https://apps.sarvam.ai';
const SARVAM_VOICE_AGENTS_API_KEY = process.env.SARVAM_VOICE_AGENTS_API_KEY || '';
const SARVAM_FROM_NUMBER = process.env.SARVAM_FROM_NUMBER || '+918064261388';
const SARVAM_AGENT_ID = process.env.SARVAM_AGENT_ID || 'Aasaan-Priy-df7121a8-673d';
const SARVAM_AGENT_VERSION = parseInt(process.env.SARVAM_AGENT_VERSION || '3', 10);
const SARVAM_ORG_ID = process.env.SARVAM_ORG_ID || '01a0b4c9-b383-7725-8437-0f2be51c264d';
const SARVAM_WORKSPACE_ID = process.env.SARVAM_WORKSPACE_ID || '01a0b4c9-b388-7c99-b7eb-b672f405486d';
const SARVAM_CONNECTION_ID = process.env.SARVAM_CONNECTION_ID || '88247919-14-c020a913-0b0c';

if (!SARVAM_VOICE_AGENTS_API_KEY) {
  console.warn('[SARVAM] SARVAM_VOICE_AGENTS_API_KEY not configured; outgoing calls will fail');
}

interface CallResult {
  success: boolean;
  message?: string;
  error?: string;
  attempt_id?: string;
  cohort_id?: string;
  campaign_id?: string;
  answer_url?: string;
  agent?: { id: string; version: number };
}

/**
 * Make an instant outbound call using Sarvam's official REST API.
 * 
 * This is the OFFICIAL way to initiate calls programmatically:
 * - No campaign required
 * - No OTP required
 * - No MCP required
 * - Works from any system with internet access
 * - Returns attempt_id immediately
 * 
 * Endpoint: POST https://apps.sarvam.ai/api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds
 * Auth: X-API-Key header
 */
async function makeCall({ to }: { to: string }): Promise<CallResult> {
  if (!SARVAM_VOICE_AGENTS_API_KEY) throw new Error('SARVAM_VOICE_AGENTS_API_KEY not configured');
  if (!SARVAM_FROM_NUMBER) throw new Error('SARVAM_FROM_NUMBER not configured');
  if (!SARVAM_AGENT_ID) throw new Error('SARVAM_AGENT_ID not configured');
  if (!SARVAM_ORG_ID) throw new Error('SARVAM_ORG_ID not configured');
  if (!SARVAM_WORKSPACE_ID) throw new Error('SARVAM_WORKSPACE_ID not configured');
  if (!SARVAM_CONNECTION_ID) throw new Error('SARVAM_CONNECTION_ID not configured');

  const url = `${SARVAM_API_BASE}/api/outbounds/v1/orgs/${SARVAM_ORG_ID}/workspaces/${SARVAM_WORKSPACE_ID}/outbounds`;

  const payload = {
    app_config: {
      app_id: SARVAM_AGENT_ID,
      app_version: 3,
      connection_config: {
        connection_id: SARVAM_CONNECTION_ID,
        agent_phone_number: SARVAM_FROM_NUMBER,
      },
      app_type: 'agent',
    },
    user_config: {
      user_phone_number: to,
    },
  };

  try {
    console.log('[SARVAM] Making instant outbound call via official REST API', { 
      to, 
      from: SARVAM_FROM_NUMBER,
      agentId: SARVAM_AGENT_ID,
      agentVersion: 3,
      orgId: SARVAM_ORG_ID,
      workspaceId: SARVAM_WORKSPACE_ID,
      connectionId: SARVAM_CONNECTION_ID,
    });

    const apiKey = process.env.SARVAM_VOICE_AGENTS_API_KEY || '';
    
    const response = await fetch(`${SARVAM_API_BASE}/api/outbounds/v1/orgs/${SARVAM_ORG_ID}/workspaces/${SARVAM_WORKSPACE_ID}/outbounds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.detail?.[0]?.msg || data?.message || JSON.stringify(data);
      console.error('[SARVAM] Instant outbound call failed:', { status: response.status, error: errorMsg });
      return { success: false, error: `SARVAM API error (${response.status}): ${errorMsg}` };
    }

    console.log('[SARVAM] Instant outbound call successful:', { attempt_id: data.attempt_id });

    return {
      success: true,
      message: `Call initiated successfully via Sarvam official API`, 
      attempt_id: data.attempt_id,
      agent: { id: 'Aasaan-Priy-df7121a8-673d', version: 3 },
    };
  } catch (error: any) {
    console.error('[SARVAM] makeCall error:', error.message);
    return { success: false, error: error.message };
  }
}

export default { makeCall };