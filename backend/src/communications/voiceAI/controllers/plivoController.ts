import { Request, Response } from 'express';
import { callSessionManager } from '../models/callSessions';
import plivoService from '../services/plivoService';

function xmlEscape(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Answer URL
export async function answer(req: Request, res: Response) {
  try {
    const params = req.body || req.query || {};
    const callUuid = params.CallUUID || params.CallUUID || params.call_uuid || params.call_uuid || 'unknown';

    // Create or update a session record
    callSessionManager.create({
      callUuid,
      from: params.From,
      to: params.To,
      direction: params.Direction,
      createdAt: new Date(),
      status: 'in-progress',
    });

    // Build Plivo XML response that instructs Plivo to open a websocket stream
    const publicBase = process.env.PUBLIC_BASE_URL || process.env.PUBLIC_WS_URL;
    if (!publicBase) {
      console.error('[PLIVO] PUBLIC_BASE_URL not set; cannot construct Stream URL');
      res.set('Content-Type', 'application/xml');
      res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response><Speak>Service unavailable</Speak><Hangup/></Response>');
      return;
    }

    const httpBase = publicBase.replace(/^wss?:\/\//i, 'https://').replace(/\/$/, '');
    const wsBase = (process.env.PUBLIC_WS_URL || httpBase).replace(/^https?:\/\//i, 'wss://').replace(/\/$/, '');
    const wsUrl = wsBase + '/ws/plivo';
    const contentType = process.env.PLIVO_STREAM_CONTENT_TYPE || 'audio/x-mulaw;rate=8000';
    let recordingXml = '';
    if (process.env.PLIVO_RECORDING_ENABLED === '1') {
      if (!httpBase.startsWith('https://') || !process.env.PLIVO_AUTH_TOKEN) {
        throw new Error('Recording requires a public HTTPS base and Plivo authentication token');
      }
      // Background recording must precede the blocking Stream, not wait for a Dial.
      // Announce before recording starts; operators must obtain any required consent.
      recordingXml = `  <Speak language="hi-IN">गुणवत्ता और प्रशिक्षण के लिए यह कॉल रिकॉर्ड की जाएगी।</Speak>\n` +
        `  <Record recordSession="true" redirect="false" maxLength="3600" fileFormat="mp3" callbackUrl="${xmlEscape(httpBase + '/webhooks/plivo/recording-ready')}" callbackMethod="POST" />\n`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${recordingXml}  <Stream bidirectional="true" keepCallAlive="true" contentType="${xmlEscape(contentType)}" statusCallbackUrl="${xmlEscape(httpBase + '/webhooks/plivo/stream-status')}">${xmlEscape(wsUrl)}</Stream>\n</Response>`;

    console.log('[PLIVO] Answering call', { callUuid, from: params.From, to: params.To, wsUrl, contentType });
    res.set('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (err) {
    console.error('Plivo answer error', err);
    res.status(500).send('<Response><Speak>Service error</Speak><Hangup/></Response>');
  }
}

// Hangup URL
export async function hangup(req: Request, res: Response) {
  try {
    const params = req.body || req.query || {};
    const callUuid = params.CallUUID || params.call_uuid || params.CallUUID || 'unknown';

    console.log('[PLIVO] hangup callback', { callUuid, params: Object.keys(params) });
    const session = callSessionManager.get(callUuid);
    if (session) {
      callSessionManager.update(callUuid, { status: 'ended' });
      // cleanup runtime resources if any
      if (session.runtime && typeof session.runtime.close === 'function') {
        try { session.runtime.close(); } catch (e) { console.error(e); }
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Plivo hangup error', err);
    res.status(500).send('ERR');
  }
}

// Fallback
export async function fallback(_req: Request, res: Response) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Speak>Sorry, we are unable to connect you right now. Please try again later.</Speak>\n  <Hangup/>\n</Response>`;
  res.set('Content-Type', 'application/xml');
  res.status(200).send(xml);
}

// Outbound call API
export async function createCall(req: Request, res: Response) {
  try {
    const { to } = req.body as { to: string };
    if (!to) return res.status(400).json({ message: 'Missing `to` number' });

    const result = await plivoService.makeCall({ to });
    res.status(200).json({ ok: true, result });
  } catch (err: any) {
    console.error('Create call error', err?.message || err);
    res.status(500).json({ ok: false, message: 'Failed to create call' });
  }
}

export default { answer, hangup, fallback, createCall };
