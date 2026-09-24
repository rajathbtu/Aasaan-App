import * as Plivo from 'plivo';

const authId = process.env.PLIVO_AUTH_ID || '';
const authToken = process.env.PLIVO_AUTH_TOKEN || '';
const fromNumber = process.env.PLIVO_FROM_NUMBER || '';

// Plivo exports can be CJS; use a safe extraction for Client
const { Client } = Plivo as any;
const client = new Client(authId, authToken);

export async function makeCall(params: { to: string }) {
  const { to } = params;
  if (!fromNumber) throw new Error('PLIVO_FROM_NUMBER not configured');

  // Build answer URL — use PUBLIC_BASE_URL if available
  const publicBase = process.env.PUBLIC_BASE_URL || process.env.PUBLIC_WS_URL;
  if (!publicBase) throw new Error('PUBLIC_BASE_URL not configured');
  const answerUrl = `${publicBase.replace(/\/$/, '')}/webhooks/plivo/answer`;
  console.log('[PLIVO] making call', { from: fromNumber, to, answerUrl });

  const r = await client.calls.create(fromNumber, to, answerUrl, { answer_method: 'POST' });
  return r;
}

export default { makeCall };
