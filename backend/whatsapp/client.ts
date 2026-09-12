/**
 * Thin HTTP client for the Meta WhatsApp Cloud API (Graph API).
 *
 * Calls the Messages endpoint directly — no SDK involved:
 *   POST https://graph.facebook.com/{API_VERSION}/{PHONE_NUMBER_ID}/messages
 *   Authorization: Bearer {ACCESS_TOKEN}
 *
 * See https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */
import { WhatsAppConfig } from './config';

export interface WhatsAppSendResult {
  /** Message id (wamid.*) assigned by Meta, useful for delivery tracking via webhooks. */
  messageId: string;
  /** WhatsApp user id (E.164 digits) of the recipient as normalized by Meta. */
  waId: string;
}

/** Error raised when Meta rejects a request, carrying the Graph API error payload. */
export class WhatsAppApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: unknown,
  ) {
    super(message);
    this.name = 'WhatsAppApiError';
  }
}

/**
 * Posts a message payload (as defined by the Cloud API Messages reference) to
 * the Graph API and returns Meta's response.
 */
export async function postWhatsAppMessage(
  config: WhatsAppConfig,
  payload: Record<string, unknown>,
): Promise<WhatsAppSendResult> {
  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  // Graph API signals failures through HTTP status AND an `error` body.
  const data: any = await response.json().catch(() => null);
  if (!response.ok || data?.error) {
    const message = data?.error?.message || `Meta API request failed with status ${response.status}`;
    throw new WhatsAppApiError(message, response.status, data?.error ?? data);
  }

  return {
    messageId: data?.messages?.[0]?.id ?? '',
    waId: data?.contacts?.[0]?.wa_id ?? String(payload.to ?? ''),
  };
}
