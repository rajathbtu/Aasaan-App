import { findUserByPhone, generateOTP } from '../models/dataStore';
import { encryptOnboardingToken } from '../utils/encryption';
import { sendSMS } from './sms/client';
import { normalizePhoneNumber, toStoredPhoneNumber } from './utils';
import { sendWA_SP_Registered, sendWA_SP_Onboarding,
} from './whatsapp/messages';


/** Coordinates SMS and WhatsApp after a service-provider missed call. */
export async function handleServiceProviderMissedCall(phone: string,): Promise<void> {
  const whatsappPhone = normalizePhoneNumber(phone);
  const storedPhone = toStoredPhoneNumber(whatsappPhone);
  const existingUser = await findUserByPhone(storedPhone);

  if (!existingUser) {
    const otp = generateOTP();
    const { token, url: onboardingUrl } = createOnboardingLink(storedPhone, otp);

    await Promise.allSettled([
      sendWA_SP_Onboarding(whatsappPhone, token),
      sendSMS(
        storedPhone, 
            `Aasaan में आपका स्वागत है!\n` +
            `नमस्ते 🙏🏼\n\n` +
            `आपने हाल ही में Aasaan ऐप पर सेवा प्रदाता के तौर पर जुड़ने के लिए हमें मिस्ड कॉल किया था।\n\n` +
            `Aasaan ऐप के ज़रिए आप नए ग्राहकों से जुड़ सकते हैं, अपनी मर्ज़ी और सुविधा के अनुसार काम के अवसर पा सकते हैं और अपनी कमाई बढ़ा सकते हैं — और इसके लिए कोई शुल्क नहीं है, कोई बाध्यता नहीं है। 🎉\n\n` +
            `आपकी प्रोफाइल बनाने के लिए बताएं:\n` +
            `आप क्या काम करते हैं?: \n` +
            `${onboardingUrl}`),
    ]);
    return;
  }

  // if the user already exists
  await Promise.allSettled([
    sendWA_SP_Registered(whatsappPhone, "< insert link>"),
    sendSMS(
      storedPhone, `आपका मोबाइल नंबर Aasaan पर सेवा प्रदाता के रूप में पहले से पंजीकृत है। \n\n`+
        `काम के नए अवसर देखने और अपनी प्रोफ़ाइल प्रबंधित करने के लिए Aasaan ऐप खोलें:: < insert link>`,
    ),
  ]);
}



function createOnboardingLink(phone: string, otp: string | number): { token: string; url: string } {
  const onboardingUrl = process.env.SP_ONBOARDING_URL?.trim();
  if (!onboardingUrl) 
    throw new Error('SP_ONBOARDING_URL is not configured. Set it in backend/.env.');
  
  const token = encryptOnboardingToken({ phone, otp: String(otp), language: 'hi' });
  return { token, url: `${onboardingUrl}${encodeURIComponent(token)}` };
}