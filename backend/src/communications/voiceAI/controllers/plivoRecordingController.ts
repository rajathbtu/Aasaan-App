import { Request, Response } from 'express';
import { validateV3Signature } from 'plivo';

// Plivo retains the recording; runtime call sessions may already be deleted.
// Do not log recording download URLs or transcript contents.
export function recordingReady(req: Request, res: Response) {
  const token = process.env.PLIVO_AUTH_TOKEN;
  const base = (process.env.PUBLIC_BASE_URL || process.env.PUBLIC_WS_URL || '')
    .replace(/^wss?:\/\//i, 'https://').replace(/\/$/, '');
  if (!token || !base.startsWith('https://')) {
    res.status(503).send('Recording callback not configured');
    return;
  }
  try {
    const signature = req.get('X-Plivo-Signature-V3') || '';
    const nonce = req.get('X-Plivo-Signature-V3-Nonce') || '';
    const url = base + req.originalUrl;
    if (!signature || !nonce || !validateV3Signature(req.method, url, nonce, token, signature, req.body || {})) {
      res.status(403).send('Invalid signature');
      return;
    }
    const params = req.body || {};
    if (typeof params.RecordingID !== 'string' || !params.RecordingID ||
        typeof params.RecordUrl !== 'string' || !params.RecordUrl) {
      res.status(400).send('Missing recording details');
      return;
    }
    console.log('[PLIVO RECORDING READY]', JSON.stringify({
      recordingId: params.RecordingID,
      callId: typeof params.CallUUID === 'string' ? params.CallUUID : undefined,
      duration: typeof params.RecordingDuration === 'string' ? params.RecordingDuration : undefined,
    }));
    res.status(200).send('OK');
  } catch {
    res.status(403).send('Invalid recording callback');
  }
}
