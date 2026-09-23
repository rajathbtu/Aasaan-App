import { readWhatsAppConfig } from './config';
import { postWhatsAppMessage, WhatsAppSendResult } from './client';
import { normalizePhoneNumber } from '../utils';


/** Sends the approved onboarding template using a token created by the flow coordinator. */
export async function sendWA_SP_Onboarding(
  phone: string,
  token: string,
): Promise<WhatsAppSendResult> {
  return postWhatsAppMessage(readWhatsAppConfig(), {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhoneNumber(phone),
    type: 'template',
    template: {
      name: 'sp_onboarding_missedcall_hindi',
      language: { policy: 'deterministic', code: 'hi' },
      components: [{
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: token }],
      }],
    },
  });
}

/** Sends the approved registered-user template; free-form text is not valid for a new conversation. */
export async function sendWA_SP_Registered(to: string, appLink: string): Promise<WhatsAppSendResult> {
  const config = readWhatsAppConfig();
  return postWhatsAppMessage(config, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhoneNumber(to),
    type: 'template',
    template: {
      name: config.registeredTemplateName,
      language: { policy: 'deterministic', code: config.registeredTemplateLanguage },
      components: [{
        type: 'body',
        parameters: [{ type: 'text', text: appLink }],
      }],
    },
  });
}

export async function sendWA_FreeText(to: string, body: string): Promise<WhatsAppSendResult> {
  return postWhatsAppMessage(readWhatsAppConfig(), {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhoneNumber(to),
    type: 'text',
    text: { preview_url: false, body },
  });
}

export async function sendWA_LocationRequest(to: string): Promise<WhatsAppSendResult> {
  return postWhatsAppMessage(readWhatsAppConfig(), {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhoneNumber(to),
    type: 'interactive',
    interactive: {
      type: 'location_request_message',
      body: { text: 'कृपया बेस लोकेशन चुनें जहाँ आप काम के अवसर पाना चाहते हैं' },
      action: { name: 'send_location' },
    },
  });
}