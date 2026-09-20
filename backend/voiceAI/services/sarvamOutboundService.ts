import fetch from 'node-fetch';

const SARVAM_API_BASE = process.env.SARVAM_API_URL || 'https://api.sarvam.ai';
const SARVAM_KEY = process.env.SARVAM_API_KEY || '';
const CAMPAIGN_ID = process.env.SARVAM_CAMPAIGN_ID || 'Aasaan-Outb-d2a21081-84fd';

interface CohortUploadResult {
  cohort_id: string;
  status: string;
  total_records?: number;
  valid_records?: number;
  rejected_records?: number;
}

interface CallResult {
  success: boolean;
  cohort_id?: string;
  message?: string;
  error?: string;
}

/**
 * Upload a cohort (CSV) to the Sarvam campaign for outbound calling.
 * This is the production way to make outbound calls with Sarvam.
 */
export async function uploadCohortToCampaign(
  phoneNumbers: string[],
  customerData?: Array<{ customer_id: string; name: string }>
): Promise<CohortUploadResult> {
  if (!SARVAM_KEY) throw new Error('SARVAM_API_KEY not configured');

  // Generate CSV content
  const csvHeaders = 'phone,customer_id,name\n';
  const csvRows = phoneNumbers.map((phone, index) => {
    const data = customerData?.[index] || { customer_id: `CUST${Date.now()}${index}`, name: `User ${index + 1}` };
    return `${phone},${data.customer_id},${data.name}`;
  }).join('\n');

  const csvContent = csvHeaders + csvRows;

  const transformation = {
    phone_number: { column_name: 'phone', country_code: 'IN' },
    user_identifier: { column_name: 'customer_id' },
    app_variables: { user_name: { column_name: 'name', required: true } }
  };

  const cohortName = `Cohort-${Date.now()}`;

  const resp = await fetch(`${SARVAM_API_BASE}/campaigns/${CAMPAIGN_ID}/cohorts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Subscription-Key': SARVAM_KEY,
    },
    body: JSON.stringify({
      name: cohortName,
      content: csvContent,
      transformation,
      parent: 'campaign',
      parent_id: CAMPAIGN_ID,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`[SARVAM] uploadCohort failed ${resp.status}: ${txt}`);
  }

  const data = await resp.json();
  return data;
}

/**
 * Get the status of a cohort upload
 */
export async function getCohortStatus(cohortId: string): Promise<CohortUploadResult> {
  if (!SARVAM_KEY) throw new Error('SARVAM_API_KEY not configured');

  const resp = await fetch(`${SARVAM_API_BASE}/campaigns/${CAMPAIGN_ID}/cohorts/${cohortId}`, {
    method: 'GET',
    headers: {
      'Api-Subscription-Key': SARVAM_KEY,
    },
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`[SARVAM] getCohortStatus failed ${resp.status}: ${txt}`);
  }

  return resp.json();
}

/**
 * Make an outbound call using the Sarvam campaign approach.
 * This uploads a cohort with the target number(s) to the campaign.
 * The campaign will dial the numbers based on its schedule (24/7 for our campaign).
 */
export async function makeCallCampaign({ to }: { to: string; customer_id?: string; name?: string }): Promise<CallResult> {
  try {
    const result = await uploadCohortToCampaign([to], to ? [{ customer_id: to.replace(/\D/g, ''), name: to }] : undefined);
    return {
      success: true,
      cohort_id: result.cohort_id,
      message: `Call queued via campaign. Cohort: ${result.cohort_id}. The campaign will dial based on its schedule.`
    };
  } catch (error: any) {
    console.error('[SARVAM] makeCallCampaign error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Make a test call using Sarvam's place_test_call API.
 * Requires the phone number to be verified first via verify_phone_number.
 * Only works for up to 10 numbers at a time.
 */
export async function makeTestCall({ to }: { to: string; app_version?: number }): Promise<CallResult> {
  if (!SARVAM_KEY) throw new Error('SARVAM_API_KEY not configured');
  if (!process.env.SARVAM_AGENT_ID) throw new Error('SARVAM_AGENT_ID not configured');

  const agentId = process.env.SARVAM_AGENT_ID;
  const agentVersion = process.env.SARVAM_AGENT_VERSION || '2';

  const resp = await fetch(`${SARVAM_API_BASE}/test-call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Subscription-Key': SARVAM_KEY,
    },
    body: JSON.stringify({
      app_id: agentId,
      app_version: parseInt(agentVersion, 10),
      phone_numbers: [to],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`[SARVAM] makeTestCall failed ${resp.status}: ${txt}`);
  }

  const data = await resp.json();
  return {
    success: true,
    message: 'Test call initiated',
    cohort_id: data.id
  };
}

export default { makeCallCampaign, makeTestCall, uploadCohortToCampaign, getCohortStatus };