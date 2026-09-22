/**
 * High-level WhatsApp messaging service.
 *
 * WhatsApp rules that matter here (see Meta docs):
 *  - To INITIATE a conversation with a user (business-initiated message) you
 *    must send a pre-approved TEMPLATE message. Free-form text is rejected
 *    outside a 24-hour "customer service window".
 *  - Inside the 24-hour window (i.e. after the user has replied) you may send
 *    free-form text via sendTextMessage().
 */
import { readWhatsAppConfig } from './config';
import { postWhatsAppMessage, WhatsAppSendResult } from './client';
import { encryptOnboardingToken } from '../src/utils/encryption';

const SP_ONBOARDING_URL =
  process.env.SP_ONBOARDING_URL || 'https://odxas8k-rajkgupta88-8081.exp.direct/onboarding?data=';

/**
 * Normalizes a phone number to the format Meta expects: plain E.164 digits
 * without the leading "+" (e.g. "+91 98765-43210" -> "919876543210").
 */
export function normalizePhoneNumber(raw: string): string {
  const digits = String(raw).replace(/\D+/g, '');
  if (digits.length < 8 || digits.length > 15) {
    throw new Error(`Invalid phone number: "${raw}". Provide it in international format, e.g. +919876543210.`);
  }
  return digits;
}

export interface InitiateConversationOptions {
  /** Recipient's phone number in any common format; normalized internally. */
  to: string;
  /** Approved template name; defaults to WHATSAPP_DEFAULT_TEMPLATE. */
  templateName?: string;
  /** Template language code; defaults to WHATSAPP_DEFAULT_TEMPLATE_LANG. */
  languageCode?: string;
  /** Values substituted into the template's {{1}}, {{2}}, ... body placeholders, in order. */
  bodyParams?: string[];
}

/**
 * Initiates a WhatsApp conversation with the given phone number by sending an
 * approved template message.  This is the only way Meta allows a business to
 * start a conversation with a user.
 */
export async function initiateConversation(options: InitiateConversationOptions): Promise<WhatsAppSendResult> {
  const config = readWhatsAppConfig();
  const to = normalizePhoneNumber(options.to);
  const templateName = options.templateName?.trim() || config.defaultTemplateName;
  const languageCode = options.languageCode?.trim() || config.defaultTemplateLanguage;

  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { policy: 'deterministic', code: languageCode },
    },
  };

  // Only include components when there are body parameters to substitute.
  if (options.bodyParams?.length) {
    (payload.template as Record<string, unknown>).components = [
      {
        type: 'body',
        parameters: options.bodyParams.map((text) => ({ type: 'text', text })),
      },
    ];
  }

  return postWhatsAppMessage(config, payload);
}

/** Creates the one-parameter SP onboarding link and sends its approved template. */
export async function sendServiceProviderOnboarding(
  phone: string,
  otp: string | number,
): Promise<{ onboardingUrl: string; result: WhatsAppSendResult }> {
  const token = encryptOnboardingToken({ phone, otp: String(otp), language: 'hi' });
  const onboardingUrl = `${SP_ONBOARDING_URL}${encodeURIComponent(token)}`;
  const config = readWhatsAppConfig();

  const result = await postWhatsAppMessage(config, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhoneNumber(phone),
    type: 'template',
    template: {
      name: 'sp_onboarding_missedcall_hindi',
      language: { policy: 'deterministic', code: 'hi' },
      components: [
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: token }],
        },
      ],
    },
  });

  return { onboardingUrl, result };
}

/**
 * Sends a free-form text message.  Only allowed within the 24-hour customer
 * service window that opens when the user last messaged the business.
 */
export async function sendTextMessage(to: string, body: string): Promise<WhatsAppSendResult> {
  const config = readWhatsAppConfig();
  return postWhatsAppMessage(config, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhoneNumber(to),
    type: 'text',
    text: { preview_url: false, body },
  });
}

/** Asks the user to share their current WhatsApp location with one tap. */
export async function sendLocationRequest(to: string): Promise<WhatsAppSendResult> {
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


