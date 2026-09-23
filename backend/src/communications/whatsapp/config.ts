/** WhatsApp Cloud API configuration loaded lazily from environment variables. */
export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  verifyToken?: string;
  appSecret?: string;
  defaultTemplateName: string;
  defaultTemplateLanguage: string;
  registeredTemplateName: string;
  registeredTemplateLanguage: string;
}

export function readWhatsAppConfig(): WhatsAppConfig {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId) {
    throw new Error(
      'WhatsApp Cloud API is not configured. Set WHATSAPP_ACCESS_TOKEN and ' +
      'WHATSAPP_PHONE_NUMBER_ID in backend/.env.'
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
    registeredTemplateName: process.env.WHATSAPP_REGISTERED_TEMPLATE?.trim() || 'sp_registered_app_link',
    registeredTemplateLanguage: process.env.WHATSAPP_REGISTERED_TEMPLATE_LANG?.trim() || 'en',
  };
}

export function isWhatsAppConfigured(): boolean {
  try {
    readWhatsAppConfig();
    return true;
  } catch {
    return false;
  }
}
