import { WhatsAppConfig } from './config';

export interface WhatsAppSendResult {
  messageId: string;
  waId: string;
}

export class WhatsAppApiError extends Error {
  constructor(message: string, readonly status: number, readonly details: unknown) {
    super(message);
    this.name = 'WhatsAppApiError';
  }
}

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
