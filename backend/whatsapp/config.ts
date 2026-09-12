/**
 * WhatsApp Cloud API (Meta) configuration.
 *
 * All credentials are read from environment variables (backend/.env).
 * Create a Meta app with the WhatsApp product to obtain the values —
 * see backend/whatsapp/README.md for step-by-step instructions.
 */

export interface WhatsAppConfig {
  /** Access token from the Meta App Dashboard (temporary test token or permanent system user token). */
  accessToken: string;
  /** "From" phone number ID shown on the WhatsApp > API Setup page. */
  phoneNumberId: string;
  /** Graph API version path segment, e.g. "v23.0". */
  apiVersion: string;
  /** Any string you choose, used to verify Meta's webhook subscription handshake. */
  verifyToken?: string;
  /** App secret (App Dashboard > App Settings > Basic), used to verify webhook payloads. */
  appSecret?: string;
  /** Approved template name used by default to initiate conversations. */
  defaultTemplateName: string;
  /** Language code of the template, e.g. "en_US". */
  defaultTemplateLanguage: string;
}

/**
 * Reads and validates the WhatsApp Cloud API credentials.  Credentials are
 * read lazily (at call time, not import time) so dotenv is always loaded first.
 * Throws with actionable guidance if mandatory values are missing.
 */
export function readWhatsAppConfig(): WhatsAppConfig {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!accessToken || !phoneNumberId) {
    throw new Error(
      'WhatsApp Cloud API is not configured. Set WHATSAPP_ACCESS_TOKEN and ' +
        'WHATSAPP_PHONE_NUMBER_ID in backend/.env. ' +
        'See backend/whatsapp/README.md for how to generate these values.'
    );
  }

  return {
    accessToken,
    phoneNumberId,
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || 'v23.0',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim() || undefined,
    appSecret: process.env.WHATSAPP_APP_SECRET?.trim() || undefined,
    defaultTemplateName: process.env.WHATSAPP_DEFAULT_TEMPLATE?.trim() || 'hello_world',
    defaultTemplateLanguage: process.env.WHATSAPP_DEFAULT_TEMPLATE_LANG?.trim() || 'en_US',
  };
}

/** Cheap check used by routes/logging to see whether WhatsApp is wired up. */
export function isWhatsAppConfigured(): boolean {
  try {
    readWhatsAppConfig();
    return true;
  } catch {
    return false;
  }
}
