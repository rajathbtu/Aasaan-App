import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { isWhatsAppConfigured, readWhatsAppConfig } from './config';

const router = Router();

router.get('/webhook', (req: Request, res: Response): void => {
  const config = readWhatsAppConfig();
  const mode = String(req.query['hub.mode'] ?? '');
  const token = String(req.query['hub.verify_token'] ?? '');
  const challenge = String(req.query['hub.challenge'] ?? '');

  if (mode === 'subscribe' && config.verifyToken && token === config.verifyToken) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

function isWebhookSignatureValid(req: Request, appSecret: string): boolean {
  const rawBody = (req as any).rawBody;
  const header = String(req.headers['x-hub-signature-256'] ?? '');
  if (!Buffer.isBuffer(rawBody) || !header.startsWith('sha256=')) return false;

  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const received = header.slice('sha256='.length);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
  } catch {
    return false;
  }
}

router.post('/webhook', (req: Request, res: Response): void => {
  const { appSecret } = readWhatsAppConfig();
  if (appSecret && !isWebhookSignatureValid(req, appSecret)) {
    res.sendStatus(401);
    return;
  }

  const entries: any[] = req.body?.entry ?? [];
  for (const entry of entries) {
    const changes: any[] = entry?.changes ?? [];
    for (const change of changes) {
      const value = change?.value ?? {};
      for (const message of value.messages ?? []) {
        console.log(`[WhatsApp] Inbound message from ${message.from}: type=${message.type}`);
      }
      for (const status of value.statuses ?? []) {
        console.log(`[WhatsApp] Message ${status.id} status: ${status.status}`);
      }
    }
  }

  res.sendStatus(200);
});

router.get('/status', (_req: Request, res: Response): void => {
  res.json({ configured: isWhatsAppConfigured() });
});

export default router;
