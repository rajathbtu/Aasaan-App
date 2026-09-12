/**
 * Express routes for the WhatsApp module.
 *
 *  POST /whatsapp/trigger   — initiate a WhatsApp conversation on a requested
 *                             phone number (authenticated; the "trigger").
 *  GET  /whatsapp/webhook   — Meta webhook subscription handshake.
 *  POST /whatsapp/webhook   — Meta webhook events (inbound messages,
 *                             delivery statuses). Signature-verified when
 *                             WHATSAPP_APP_SECRET is configured.
 *  GET  /whatsapp/status    — reports whether credentials are configured.
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authenticate } from '../src/middleware/authMiddleware';
import { isWhatsAppConfigured, readWhatsAppConfig } from './config';
import { initiateConversation } from './service';
import { triggerWhatsAppEvent, WHATSAPP_EVENT_NAMES, WhatsAppEventName } from './events';
import { WhatsAppApiError } from './client';

const router = Router();

/**
 * Trigger endpoint: initiates a WhatsApp conversation on the requested phone
 * number by sending an approved template message.  Any controller/flow in the
 * backend can also call initiateConversation() directly from code.
 *
 * Body:
 *   { "phone": "+919876543210",
 *     "templateName": "hello_world",        // optional, falls back to env default
 *     "languageCode": "en_US",             // optional
 *     "bodyParams": ["Ravi", "Plumbing"] } // optional, per template {{n}} slots
 */
router.post('/trigger', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { phone, templateName, languageCode, bodyParams } = req.body ?? {};
  if (!phone || typeof phone !== 'string') {
    res.status(400).json({ message: '"phone" is required (international format, e.g. +919876543210).' });
    return;
  }

  try {
    const result = await initiateConversation({
      to: phone,
      templateName: typeof templateName === 'string' ? templateName : undefined,
      languageCode: typeof languageCode === 'string' ? languageCode : undefined,
      bodyParams: Array.isArray(bodyParams) ? bodyParams.map(String) : undefined,
    });
    res.json({ success: true, to: result.waId, messageId: result.messageId });
  } catch (error) {
    if (error instanceof WhatsAppApiError) {
      // Meta rejected the request (bad token, unapproved template, recipient
      // not a test number, etc.) — surface the reason to the caller.
      console.error('WhatsApp API error:', error.message, error.details);
      res.status(error.status >= 400 && error.status < 500 ? error.status : 502).json({
        message: error.message,
        details: error.details,
      });
      return;
    }
    console.error('WhatsApp trigger failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to initiate WhatsApp conversation.';
    res.status(500).json({ message });
  }
});

/** Receives application/telephony events that should start a WhatsApp flow. */
router.post('/events', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { event, phone } = req.body ?? {};
  if (!WHATSAPP_EVENT_NAMES.includes(event) || typeof phone !== 'string' || !phone.trim()) {
    res.status(400).json({
      message: `event must be one of ${WHATSAPP_EVENT_NAMES.join(', ')} and phone is required.`,
    });
    return;
  }

  try {
    const result = await triggerWhatsAppEvent({ event: event as WhatsAppEventName, phone });
    res.json({ success: true, event, to: result.waId, messageId: result.messageId });
  } catch (error) {
    console.error(`[WhatsApp] Event ${event} failed:`, error);
    res.status(502).json({ message: error instanceof Error ? error.message : 'WhatsApp event failed.' });
  }
});

/** Meta verifies the webhook URL with a one-time handshake. */
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

/**
 * Verifies the X-Hub-Signature-256 header against the HMAC-SHA256 of the raw
 * request body, using the Meta app secret.  The raw body is captured by the
 * express.json verify() hook registered in src/app.ts.
 */
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

/** Meta posts message/status events here. */
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
        const buttonId =
          message.interactive?.button_reply?.id ||
          message.button?.payload;
        const listId = message.interactive?.list_reply?.id;

        if (buttonId === 'choose_services') {
          void triggerWhatsAppEvent({ event: 'sp_fetch_services', phone: message.from })
            .catch((error) => console.error('[WhatsApp] Service list failed:', error));
        }

        console.log(`[WhatsApp] Inbound message from ${message.from}: type=${message.type}`);
        if (listId) console.log(`[WhatsApp] Selected list item: ${listId}`);
      }
      for (const status of value.statuses ?? []) {
        console.log(`[WhatsApp] Message ${status.id} status: ${status.status}`);
      }
    }
  }

  // Meta requires a fast 200; anything else triggers retries.
  res.sendStatus(200);
});

/** Lightweight report of whether the WhatsApp credentials are in place. */
router.get('/status', (_req: Request, res: Response): void => {
  res.json({ configured: isWhatsAppConfigured() });
});

export default router;
