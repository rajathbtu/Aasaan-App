import { getServices } from '../src/utils/serviceCache';
import { initiateConversation, sendLocationRequest, sendServiceList } from './service';

export const WHATSAPP_EVENT_NAMES = ['sp_missed_call', 'sp_fetch_services', 'sp_ask_location'] as const;
export type WhatsAppEventName = typeof WHATSAPP_EVENT_NAMES[number];

export interface WhatsAppEventPayload {
  event: WhatsAppEventName;
  phone: string;
}

/** Dispatches business events to the appropriate WhatsApp message flow. */
export async function triggerWhatsAppEvent({ event, phone }: WhatsAppEventPayload) {
  switch (event) {
    case 'sp_missed_call':
      return initiateConversation({
        to: phone,
        templateName: 'init_sp_onboard_missedcall',
        languageCode: 'hi',
      });
    case 'sp_fetch_services':
        return sendServiceList(phone, await getServices());
    case 'sp_ask_location':
      return sendLocationRequest(phone);
  }
}