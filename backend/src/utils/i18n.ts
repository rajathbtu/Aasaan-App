// Backend i18n utilities: translations, translator, and helpers to localize API responses
import prisma from './prisma';
import { pushNotification } from '../models/dataStore';
import { sendExpoPushToUser } from './expoPush';

export type Locale = 'en' | 'hi' | 'gu' | 'mr' | 'ta' | 'te' | 'kn';

const supportedLocales: Locale[] = ['en', 'hi', 'gu', 'mr', 'ta', 'te', 'kn'];

// Basic interpolation: replaces {key} with value from params
function interpolate(template: string, params?: Record<string, any>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    return v === undefined || v === null ? '' : String(v);
  });
}

// Centralized translations for backend messages
const translations: Record<Locale, Record<string, any>> = {
  en: {
    common: {
      missingAuthHeader: 'Missing Authorization header',
      invalidToken: 'Invalid token',
      authLookupFailed: 'Auth lookup failed',
      internalError: 'Internal server error',
    },
    auth: {
      invalidPhone: 'Invalid phone number',
      otpSent: 'OTP sent',
      incorrectOtp: 'Incorrect OTP',
      invalidName: 'Invalid name',
      userExists: 'User already exists',
    },
    user: {
      notFound: 'Not found',
      profileFetchFailed: 'Profile fetch failed',
      invalidAvatarUrl: 'Invalid avatarUrl',
      invalidServicesArray: 'Services must be a non-empty string array',
      invalidRadius: 'Invalid radius value',
      invalidLocation: 'Invalid location',
      updateFailed: 'Update failed',
    },
    services: {
      fetchFailed: 'Failed to fetch services',
    },
    notifications: {
      newRequest: {
        title: 'New Work Opportunity Nearby!',
        message: '{name} is looking for your service ({service}). Don\'t miss out!'
      },
      providerAccepted: {
        title: 'Provider Accepted Your Request',
        message: '{name} ({service}) has accepted your work request. You can now contact them directly.'
      },
      boosted: {
        title: 'Your request has been boosted',
        message: 'Your work request will now appear at the top of provider feeds.'
      },
      subscriptionSuccess: {
        title: 'Subscription Successful',
        message: 'You have subscribed to the {plan} plan. Enjoy your benefits!'
      }
    },
    request: {
      onlyEndUsersCreate: 'Only end users can create work requests',
      serviceRequired: 'Service is required',
      invalidTags: 'Invalid tags',
      limitReached: 'Work request limit reached',
      createFailed: 'Create failed',
      notFound: 'Work request not found',
      notAuthorised: 'Not authorised',
      fetchFailed: 'Failed to fetch work request',
      accept: {
        onlyProviders: 'Only service providers can accept requests',
        providerProfileIncomplete: 'Provider profile incomplete',
        notEligible: 'Not eligible for this request',
        alreadyAccepted: 'Already accepted',
        failed: 'Accept failed',
      },
      close: {
        onlyEndUsers: 'Only end users can close requests',
        alreadyClosed: 'Already closed',
        invalidStarRating: 'Invalid star rating (1-5)',
        providerDidNotAccept: 'Selected provider did not accept this request',
        failed: 'Close failed',
      }
    },
    payment: {
      onlyEndUsers: 'Only end users can boost requests',
      alreadyBoosted: 'Work request is already boosted',
      insufficientCredits: 'Insufficient credit points',
      boostFailed: 'Boost failed',
      orderCreationFailed: 'Failed to create payment order',
      invalidSignature: 'Invalid payment signature',
      paymentNotSuccessful: 'Payment was not successful',
      verificationFailed: 'Payment verification failed',
    },
    subscription: {
      onlyProviders: 'Only service providers can subscribe',
      failed: 'Subscription failed',
      invalidPlan: 'Invalid subscription plan',
    }
  },
  hi: {
    common: {
      missingAuthHeader: 'ऑथराइजेशन हेडर गुम है',
      invalidToken: 'अमान्य टोकन',
      authLookupFailed: 'प्रमाणीकरण जाँच विफल',
      internalError: 'आंतरिक सर्वर त्रुटि',
    },
    auth: {
      invalidPhone: 'अमान्य फ़ोन नंबर',
      otpSent: 'ओटीपी भेजा गया',
      incorrectOtp: 'गलत ओटीपी',
      invalidName: 'अमान्य नाम',
      userExists: 'उपयोगकर्ता पहले से मौजूद है',
    },
    user: {
      notFound: 'नहीं मिला',
      profileFetchFailed: 'प्रोफ़ाइल प्राप्त करने में विफल',
      invalidAvatarUrl: 'अमान्य avatarUrl',
      invalidServicesArray: 'सेवाएँ वैध स्ट्रिंग सूची होनी चाहिए',
      invalidRadius: 'अमान्य त्रिज्या मान',
      invalidLocation: 'अमान्य स्थान',
      updateFailed: 'अपडेट विफल',
    },
    services: { fetchFailed: 'सेवाएँ प्राप्त करने में विफल' },
    notifications: {
      newRequest: {
        title: 'पास में नया काम अवसर!',
        message: '{name} को आपकी सेवा ({service}) चाहिए। मौका न चूकें!'
      },
      providerAccepted: {
        title: 'प्रदाता ने आपका अनुरोध स्वीकार किया',
        message: '{name} ({service}) ने आपका अनुरोध स्वीकार कर लिया है। अब आप सीधे संपर्क कर सकते हैं।'
      },
      boosted: {
        title: 'आपका अनुरोध बूस्ट किया गया है',
        message: 'अब आपका अनुरोध प्रदाताओं की सूची में शीर्ष पर दिखेगा।'
      },
      subscriptionSuccess: {
        title: 'सदस्यता सफल',
        message: 'आपने {plan} योजना की सदस्यता ले ली है। लाभ उठाइए!'
      }
    },
    request: {
      onlyEndUsersCreate: 'केवल एंड यूज़र कार्य अनुरोध बना सकते हैं',
      serviceRequired: 'सेवा आवश्यक है',
      invalidTags: 'अमान्य टैग',
      limitReached: 'वर्क रिक्वेस्ट सीमा पूरी हो गई',
      createFailed: 'बनाने में विफल',
      notFound: 'वर्क रिक्वेस्ट नहीं मिला',
      notAuthorised: 'अनधिकृत',
      fetchFailed: 'वर्क रिक्वेस्ट प्राप्त करने में विफल',
      accept: {
        onlyProviders: 'केवल सेवा प्रदाता अनुरोध स्वीकार कर सकते हैं',
        providerProfileIncomplete: 'प्रदाता प्रोफ़ाइल अधूरी है',
        notEligible: 'इस अनुरोध के लिए पात्र नहीं',
        alreadyAccepted: 'पहले ही स्वीकार किया गया',
        failed: 'स्वीकार करने में विफल',
      },
      close: {
        onlyEndUsers: 'केवल एंड यूज़र अनुरोध बंद कर सकते हैं',
        alreadyClosed: 'पहले से बंद',
        invalidStarRating: 'अमान्य स्टार रेटिंग (1-5)',
        providerDidNotAccept: 'चयनित प्रदाता ने यह अनुरोध स्वीकार नहीं किया',
        failed: 'बंद करने में विफल',
      }
    },
    payment: {
      onlyEndUsers: 'केवल एंड यूज़र बूस्ट कर सकते हैं',
      alreadyBoosted: 'वर्क रिक्वेस्ट पहले से बूस्टेड है',
      insufficientCredits: 'पर्याप्त क्रेडिट पॉइंट्स नहीं',
      boostFailed: 'बूस्ट विफल',
    },
    subscription: {
      onlyProviders: 'केवल सेवा प्रदाता सदस्यता ले सकते हैं',
      failed: 'सदस्यता विफल',
    }
  },
  gu: {
    common: {
      missingAuthHeader: 'ઑથોરાઇઝેશન હેડર ગાયબ છે',
      invalidToken: 'અમાન્ય ટોકન',
      authLookupFailed: 'ઓથ ચેક નિષ્ફળ',
      internalError: 'આંતરિક સર્વર ભૂલ',
    },
    auth: {
      invalidPhone: 'અમાન્ય ફોન નંબર',
      otpSent: 'ઓટીપી મોકલાયો',
      incorrectOtp: 'ખોટો ઓટીપી',
      invalidName: 'અમાન્ય નામ',
      userExists: 'વપરાશકર્તા પહેલેથી અસ્તિત્વમાં છે',
    },
    user: {
      notFound: 'મળ્યો નથી',
      profileFetchFailed: 'પ્રોફાઇલ મેળવવામાં નિષ્ફળ',
      invalidAvatarUrl: 'અમાન્ય avatarUrl',
      invalidServicesArray: 'સેવાઓ માન્ય સ્ટ્રિંગ સૂચિ હોવી જોઈએ',
      invalidRadius: 'અમાન્ય વ્યાસ મૂલ્ય',
      invalidLocation: 'અમાન્ય સ્થાન',
      updateFailed: 'અપડેટ નિષ્ફળ',
    },
    services: { fetchFailed: 'સેવાઓ મેળવવામાં નિષ્ફળ' },
    notifications: {
      newRequest: {
        title: 'નજીકમાં નવી કામ તક!',
        message: '{name} ને તમારી સેવા ({service}) જોઈએ છે. તક ચૂકી ન જશો!'
      },
      providerAccepted: {
        title: 'પ્રદાતાએ તમારો વિનંતી સ્વીકારી',
        message: '{name} ({service}) એ તમારો વિનંતી સ્વીકારી છે. હવે તમે સીધા સંપર્ક કરી શકો છો.'
      },
      boosted: {
        title: 'તમારી વિનંતી બૂસ્ટ થઈ છે',
        message: 'હવે તમારી વિનંતી પ્રદાતાઓની યાદીમાં ટોચ પર દેખાશે.'
      },
      subscriptionSuccess: {
        title: 'સબ્સ્ક્રિપ્શન સફળ',
        message: 'તમે {plan} પ્લાન સબ્સ્ક્રાઇબ કર્યો છે. લાભ લો!'
      }
    },
    request: {
      onlyEndUsersCreate: 'ફક્ત એન્ડ યુઝર્સ કામ વિનંતી બનાવી શકે',
      serviceRequired: 'સેવા જરૂરી છે',
      invalidTags: 'અમાન્ય ટૅગ્સ',
      limitReached: 'કામ વિનંતીની મર્યાદા પહોંચી',
      createFailed: 'બનાવવામાં નિષ્ફળ',
      notFound: 'કામ વિનંતી મળી નથી',
      notAuthorised: 'અનધિકૃત',
      fetchFailed: 'કામ વિનંતી મેળવવામાં નિષ્ફળ',
      accept: {
        onlyProviders: 'ફક્ત સેવા પ્રદાતા વિનંતી સ્વીકારી શકે',
        providerProfileIncomplete: 'પ્રદાતાની પ્રોફાઇલ અધૂરી છે',
        notEligible: 'આ વિનંતી માટે પાત્ર નથી',
        alreadyAccepted: 'પહેલેથી સ્વીકારેલ',
        failed: 'સ્વીકારવામાં નિષ્ફળ',
      },
      close: {
        onlyEndUsers: 'ફક્ત એન્ડ યુઝર્સ વિનંતી બંધ કરી શકે',
        alreadyClosed: 'પહેલેથી બંધ',
        invalidStarRating: 'અમાન્ય સ્ટાર રેટિંગ (1-5)',
        providerDidNotAccept: 'પસંદ કરેલા પ્રદાતાએ આ વિનંતી સ્વીકારી નથી',
        failed: 'બંધ કરવામાં નિષ્ફળ',
      }
    },
    payment: {
      onlyEndUsers: 'ફક્ત એન્ડ યુઝર્સ બૂસ્ટ કરી શકે',
      alreadyBoosted: 'કામ વિનંતી પહેલેથી બૂસ્ટ છે',
      insufficientCredits: 'ક્રેડિટ પોઇન્ટ્સ પૂરતા નથી',
      boostFailed: 'બૂસ્ટ નિષ્ફળ',
    },
    subscription: {
      onlyProviders: 'ફક્ત સેવા પ્રદાતા સબ્સ્ક્રાઇબ કરી શકે',
      failed: 'સબ્સ્ક્રિપ્શન નિષ્ફળ',
    }
  },
  mr: {
    common: {
      missingAuthHeader: 'ऑथोरायझेशन हेडर गायब आहे',
      invalidToken: 'अवैध टोकन',
      authLookupFailed: 'प्रमाणीकरण तपास अयशस्वी',
      internalError: 'आंतरगत सर्व्हर त्रुटी',
    },
    auth: {
      invalidPhone: 'अवैध फोन नंबर',
      otpSent: 'ओटीपी पाठवला',
      incorrectOtp: 'चुकीचा ओटीपी',
      invalidName: 'अवैध नाव',
      userExists: 'वापरकर्ता आधीच अस्तित्वात आहे',
    },
    user: {
      notFound: 'सापडले नाही',
      profileFetchFailed: 'प्रोफाइल मिळवणे अयशस्वी',
      invalidAvatarUrl: 'अवैध avatarUrl',
      invalidServicesArray: 'सेवा वैध स्ट्रिंग यादी असावी',
      invalidRadius: 'अवैध त्रिज्या मूल्य',
      invalidLocation: 'अवैध स्थान',
      updateFailed: 'अपडेट अयशस्वी',
    },
    services: { fetchFailed: 'सेवा मिळवणे अयशस्वी' },
    notifications: {
      newRequest: {
        title: 'जवळ नवीन कामाची संधी!',
        message: '{name} ला तुमची सेवा ({service}) हवी आहे. संधी चुकवू नका!'
      },
      providerAccepted: {
        title: 'प्रोव्हायडरने तुमची विनंती स्वीकारली',
        message: '{name} ({service}) ने तुमची विनंती स्वीकारली आहे. आता तुम्ही थेट संपर्क करू शकता.'
      },
      boosted: {
        title: 'तुमची विनंती बूस्ट केली गेली आहे',
        message: 'आता तुमची विनंती पुरवठादारांच्या यादीत वर दिसेल.'
      },
      subscriptionSuccess: {
        title: 'सदस्यता यशस्वी',
        message: 'तुम्ही {plan} प्लॅनची सदस्यता घेतली आहे. लाभ घ्या!'
      }
    },
    request: {
      onlyEndUsersCreate: 'फक्त एंड यूजर्स काम विनंती तयार करू शकतात',
      serviceRequired: 'सेवा आवश्यक आहे',
      invalidTags: 'अवैध टॅग',
      limitReached: 'काम विनंतीची मर्यादा पूर्ण',
      createFailed: 'तयार करण्यात अयशस्वी',
      notFound: 'काम विनंती सापडली नाही',
      notAuthorised: 'अनधिकृत',
      fetchFailed: 'काम विनंती मिळवणे अयशस्वी',
      accept: {
        onlyProviders: 'फक्त सेवा पुरवठादार स्वीकारू शकतात',
        providerProfileIncomplete: 'पुरवठादार प्रोफाइल अपूर्ण आहे',
        notEligible: 'या विनंतीसाठी पात्र नाही',
        alreadyAccepted: 'आधीच स्वीकारले',
        failed: 'स्वीकारण्यात अयशस्वी',
      },
      close: {
        onlyEndUsers: 'फक्त एंड यूजर्स विनंती बंद करू शकतात',
        alreadyClosed: 'आधीच बंद',
        invalidStarRating: 'अवैध स्टार रेटिंग (1-5)',
        providerDidNotAccept: 'निवडलेल्या पुरवठादाराने विनंती स्वीकारली नाही',
        failed: 'बंद करण्यात अयशस्वी',
      }
    },
    payment: {
      onlyEndUsers: 'फक्त एंड यूजर्स बूस्ट करू शकतात',
      alreadyBoosted: 'काम विनंती आधीच बूस्ट आहे',
      insufficientCredits: 'क्रेडिट पॉईंट्स अपुरे',
      boostFailed: 'बूस्ट अयशस्वी',
    },
    subscription: {
      onlyProviders: 'फक्त सेवा पुरवठादार सदस्यता घेऊ शकतात',
      failed: 'सदस्यता अयशस्वी',
    }
  },
  ta: {
    common: {
      missingAuthHeader: 'அங்கீகார தலைப்பு இல்லை',
      invalidToken: 'தவறான டோக்கன்',
      authLookupFailed: 'அங்கீகார சரிபார்ப்பு தோல்வி',
      internalError: 'உள்ளக சேவையக பிழை',
    },
    auth: {
      invalidPhone: 'தவறான தொலைபேசி எண்',
      otpSent: 'OTP அனுப்பப்பட்டது',
      incorrectOtp: 'தவறான OTP',
      invalidName: 'தவறான பெயர்',
      userExists: 'பயனர் ஏற்கனவே உள்ளார்',
    },
    user: {
      notFound: 'காணப்படவில்லை',
      profileFetchFailed: 'சுயவிவரம் பெற முடியவில்லை',
      invalidAvatarUrl: 'தவறான avatarUrl',
      invalidServicesArray: 'சேவைகள் செல்லுபடியாகும் சரம் பட்டியலாக இருக்க வேண்டும்',
      invalidRadius: 'செல்லுபடியாகாத விட்ட மதிப்பு',
      invalidLocation: 'தவறான இடம்',
      updateFailed: 'புதுப்பிப்பு தோல்வி',
    },
    services: { fetchFailed: 'சேவைகளை பெற முடியவில்லை' },
    notifications: {
      newRequest: {
        title: 'அருகில் புதிய வேலை வாய்ப்பு!',
        message: '{name} உங்கள் சேவை ({service}) தேடுகிறார். வாய்ப்பை தவறவிடாதீர்கள்!'
      },
      providerAccepted: {
        title: 'சேவை வழங்குநர் உங்கள் கோரிக்கையை ஏற்றார்',
        message: '{name} ({service}) உங்கள் கோரிக்கையை ஏற்றுள்ளார். இப்போது நேரடியாக தொடர்புகொள்ளலாம்.'
      },
      boosted: {
        title: 'உங்கள் கோரிக்கை அதிகரிக்கப்பட்டது',
        message: 'இப்போது உங்கள் கோரிக்கை வழங்குநர் பட்டியலின் மேற்பகுதியில் தோன்றும்.'
      },
      subscriptionSuccess: {
        title: 'சந்தா வெற்றிகரமாக முடிந்தது',
        message: 'நீங்கள் {plan} திட்டத்தை சந்தா செய்துள்ளீர்கள். பலன்களை அனுபவிக்கவும்!'
      }
    },
    request: {
      onlyEndUsersCreate: 'இறுதி பயனர்கள் மட்டுமே வேலை கோரிக்கைகளை உருவாக்க முடியும்',
      serviceRequired: 'சேவை அவசியம்',
      invalidTags: 'தவறான குறிச்சொற்கள்',
      limitReached: 'வேலை கோரிக்கை வரம்பை எட்டியது',
      createFailed: 'உருவாக்கம் தோல்வி',
      notFound: 'வேலை கோரிக்கை கிடைக்கவில்லை',
      notAuthorised: 'அனுமதி இல்லை',
      fetchFailed: 'வேலை கோரிக்கையை பெற முடியவில்லை',
      accept: {
        onlyProviders: 'சேவை வழங்குநர்கள் மட்டுமே ஏற்க முடியும்',
        providerProfileIncomplete: 'வழங்குநர் சுயவிவரம் முழுமையில்லை',
        notEligible: 'இந்த கோரிக்கைக்கு தகுதியில்லை',
        alreadyAccepted: 'ஏற்கனவே ஏற்றுக்கொள்ளப்பட்டது',
        failed: 'ஏற்கும் செயல் தோல்வி',
      },
      close: {
        onlyEndUsers: 'இறுதி பயனர்கள் மட்டுமே கோரிக்கையை மூட முடியும்',
        alreadyClosed: 'ஏற்கனவே மூடப்பட்டது',
        invalidStarRating: 'தவறான நட்சத்திர மதிப்பீடு (1-5)',
        providerDidNotAccept: 'தேர்ந்தெடுத்த வழங்குநர் இந்த கோரிக்கையை ஏற்கவில்லை',
        failed: 'மூடும் செயல் தோல்வி',
      }
    },
    payment: {
      onlyEndUsers: 'இறுதி பயனர்கள் மட்டுமே புஸ்ட் செய்ய முடியும்',
      alreadyBoosted: 'வேலை கோரிக்கை ஏற்கனவே புஸ்ட் செய்யப்பட்டது',
      insufficientCredits: 'போதுமான கிரெடிட் புள்ளிகள் இல்லை',
      boostFailed: 'புஸ்ட் தோல்வி',
    },
    subscription: {
      onlyProviders: 'சேவை வழங்குநர்கள் மட்டுமே சந்தா செய்ய முடியும்',
      failed: 'சந்தா தோல்வி',
    }
  },
  te: {
    common: {
      missingAuthHeader: 'అధికారీకరణ హెడ్డర్ లేదు',
      invalidToken: 'చెల్లని టోకెన్',
      authLookupFailed: 'ప్రామాణీకరణ పరిశీలన విఫలమైంది',
      internalError: 'అంతర్గత సర్వర్ లోపం',
    },
    auth: {
      invalidPhone: 'చెల్లని ఫోన్ నంబర్',
      otpSent: 'OTP పంపబడింది',
      incorrectOtp: 'తప్పు OTP',
      invalidName: 'చెల్లని పేరు',
      userExists: 'వినియోగదారు ఇప్పటికే ఉన్నారు',
    },
    user: {
      notFound: 'దొరకలేదు',
      profileFetchFailed: 'ప్రొఫైల్ తీసుకురావడంలో వైఫల్యం',
      invalidAvatarUrl: 'చెల్లని avatarUrl',
      invalidServicesArray: 'సేవలు చెల్లుబాటు అయ్యే స్ట్రింగ్ జాబితాగా ఉండాలి',
      invalidRadius: 'చెల్లని వ్యాసార్థం విలువ',
      invalidLocation: 'చెల్లని స్థానం',
      updateFailed: 'నవీకరణ విఫలమైంది',
    },
    services: { fetchFailed: 'సేవలను తీసుకురావడంలో వైఫల్యం' },
    notifications: {
      newRequest: {
        title: 'సమీపంలో కొత్త పనివకాశం!',
        message: '{name} మీ సేవ ({service}) కోసం వెతుకుతున్నారు. అవకాశాన్ని కోల్పోవద్దు!'
      },
      providerAccepted: {
        title: 'ప్రొవైడర్ మీ అభ్యర్థనను అంగీకరించారు',
        message: '{name} ({service}) మీ పనివినతిని అంగీకరించారు. ఇప్పుడు మీరు నేరుగా సంప్రదించవచ్చు.'
      },
      boosted: {
        title: 'మీ అభ్యర్థన బూస్ట్ చేయబడింది',
        message: 'ఇప్పుడు మీ పనివినతి ప్రొవైడర్ లిస్ట్‌లో అగ్రభాగంలో కనిపిస్తుంది.'
      },
      subscriptionSuccess: {
        title: 'చందా విజయవంతం',
        message: 'మీరు {plan} ప్లాన్‌కు చందా అయ్యారు. ప్రయోజనాలను ఆస్వాదించండి!'
      }
    },
    request: {
      onlyEndUsersCreate: 'ఎండ్ యూజర్లు మాత్రమే పనివినతులు సృష్టించగలరు',
      serviceRequired: 'సేవ అవసరం',
      invalidTags: 'చెల్లని ట్యాగులు',
      limitReached: 'పనివినతి పరిమితి చేరింది',
      createFailed: 'సృష్టించడం విఫలమైంది',
      notFound: 'పనివినతి దొరకలేదు',
      notAuthorised: 'అనుమతి లేదు',
      fetchFailed: 'పనివినతిని తీసుకురావడంలో వైఫల్యం',
      accept: {
        onlyProviders: 'సేవ ప్రొవైడర్లు మాత్రమే అంగీకరించగలరు',
        providerProfileIncomplete: 'ప్రొవైడర్ ప్రొఫైల్ అసంపూర్ణంగా ఉంది',
        notEligible: 'ఈ వినతికి అర్హత లేదు',
        alreadyAccepted: 'ఇప్పటికే అంగీకరించారు',
        failed: 'అంగీకరించడం విఫలమైంది',
      },
      close: {
        onlyEndUsers: 'ఎండ్ యూజర్లు మాత్రమే మూసివేయగలరు',
        alreadyClosed: 'ఇప్పటికే మూసివేయబడింది',
        invalidStarRating: 'చెల్లని స్టార్ రేటింగ్ (1-5)',
        providerDidNotAccept: 'ఎంచుకున్న ప్రొవైడర్ ఈ వినతిని అంగీకరించలేదు',
        failed: 'మూసివేత విఫలమైంది',
      }
    },
    payment: {
      onlyEndUsers: 'ఎండ్ యూజర్లు మాత్రమే బూస్ట్ చేయగలరు',
      alreadyBoosted: 'పనివినతి ఇప్పటికే బూస్ట్ చేయబడింది',
      insufficientCredits: 'క్రెడిట్ పాయింట్లు సరిపోవడం లేదు',
      boostFailed: 'బూస్ట్ విఫలమైంది',
    },
    subscription: {
      onlyProviders: 'సేవ ప్రొవైడర్లు మాత్రమే చందా అవ్వగలరు',
      failed: 'చందా విఫలమైంది',
    }
  },
  kn: {
    common: {
      missingAuthHeader: 'ಅಧಿಕಾರ ಶೀರ್ಷಿಕೆ ಕಾಣೆಯಾಗಿದೆ',
      invalidToken: 'ಅಮಾನ್ಯ ಟೋಕನ್',
      authLookupFailed: 'ಪ್ರಮಾಣೀಕರಣ ಪರಿಶೀಲನೆ ವಿಫಲವಾಯಿತು',
      internalError: 'ಆಂತರಿಕ ಸರ್ವರ್ ದೋಷ',
    },
    auth: {
      invalidPhone: 'ಅಮಾನ್ಯ ಫೋನ್ ಸಂಖ್ಯೆ',
      otpSent: 'OTP ಕಳುಹಿಸಲಾಗಿದೆ',
      incorrectOtp: 'ತಪ್ಪು OTP',
      invalidName: 'ಅಮಾನ್ಯ ಹೆಸರು',
      userExists: 'ಬಳಕೆದಾರ ಈಗಾಗಲೇ ಇದ್ದಾರೆ',
    },
    user: {
      notFound: 'ಕಂಡುಬಂದಿಲ್ಲ',
      profileFetchFailed: 'ಪ್ರೊಫೈಲ್ ಪಡೆಯುವಲ್ಲಿ ವಿಫಲ',
      invalidAvatarUrl: 'ಅಮಾನ್ಯ avatarUrl',
      invalidServicesArray: 'ಸೇವೆಗಳು ಸರಿಯಾದ ಸ್ಟ್ರಿಂಗ್ ಪಟ್ಟಿಯಾಗಿರಬೇಕು',
      invalidRadius: 'ಅಮಾನ್ಯ ವ್ಯಾಪ್ತಿ ಮೌಲ್ಯ',
      invalidLocation: 'ಅಮಾನ್ಯ ಸ್ಥಳ',
      updateFailed: 'ನವೀಕರಣ ವಿಫಲ',
    },
    services: { fetchFailed: 'ಸೇವೆಗಳು ಪಡೆಯುವಲ್ಲಿ ವಿಫಲ' },
    notifications: {
      newRequest: {
        title: 'ಹತ್ತಿರದಲ್ಲಿ ಹೊಸ ಕೆಲಸದ ಅವಕಾಶ!',
        message: '{name} ಅವರಿಗೆ ನಿಮ್ಮ ಸೇವೆ ({service}) ಬೇಕಾಗಿದೆ. ಅವಕಾಶ ತಪ್ಪಿಸಿಕೊಳ್ಳಬೇಡಿ!'
      },
      providerAccepted: {
        title: 'ಪೂರೈಕೆದಾರರು ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಸ್ವೀಕರಿಸಿದ್ದಾರೆ',
        message: '{name} ({service}) ನಿಮ್ಮ ಕೆಲಸದ ವಿನಂತಿಯನ್ನು ಸ್ವೀಕರಿಸಿದ್ದಾರೆ. ಈಗ ನೀವು ನೇರವಾಗಿ ಸಂಪರ್ಕಿಸಬಹುದು.'
      },
      boosted: {
        title: 'ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಬೂಸ್ಟ್ ಮಾಡಲಾಗಿದೆ',
        message: 'ಈಗ ನಿಮ್ಮ ವಿನಂತಿ ಪೂರೈಕೆದಾರರ ಪಟ್ಟಿಯ ಮೆಟ್ಟಿಲಿನಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.'
      },
      subscriptionSuccess: {
        title: 'ಚಂದಾದಾರಿಕೆ ಯಶಸ್ವಿ',
        message: 'ನೀವು {plan} ಯೋಜನೆಗೆ ಚಂದಾದಾರರಾಗಿದ್ದೀರಿ. ಪ್ರಯೋಜನಗಳನ್ನು ಅನುಭವಿಸಿ!'
      }
    },
    request: {
      onlyEndUsersCreate: 'ಎಂಡ್ ಯೂಸರ್‌ಗಳು ಮಾತ್ರ ಕೆಲಸದ ವಿನಂತಿ ರಚಿಸಬಹುದು',
      serviceRequired: 'ಸೇವೆ ಅಗತ್ಯ',
      invalidTags: 'ಅಮಾನ್ಯ ಟ್ಯಾಗ್ಗಳು',
      limitReached: 'ಕೆಲಸದ ವಿನಂತಿಯ ಮಿತಿ ತಲುಪಿದೆ',
      createFailed: 'ರಚನೆ ವಿಫಲ',
      notFound: 'ಕೆಲಸದ ವಿನಂತಿ ಕಂಡುಬರುತ್ತಿಲ್ಲ',
      notAuthorised: 'ಅಧಿಕಾರವಿಲ್ಲ',
      fetchFailed: 'ಕೆಲಸದ ವಿನಂತಿ ಪಡೆಯುವಲ್ಲಿ ವಿಫಲ',
      accept: {
        onlyProviders: 'ಸೇವಾ ಪೂರೈಕೆದಾರರು ಮಾತ್ರ ಸ್ವೀಕರಿಸಬಹುದು',
        providerProfileIncomplete: 'ಪೂರೈಕೆದಾರರ ಪ್ರೊಫೈಲ್ ಅಪೂರ್ಣವಾಗಿದೆ',
        notEligible: 'ಈ ವಿನಂತಿಗೆ ಪಾತ್ರವಿಲ್ಲ',
        alreadyAccepted: 'ಈಗಾಗಲೇ ಸ್ವೀಕರಿಸಲಾಗಿದೆ',
        failed: 'ಸ್ವೀಕೃತಿ ವಿಫಲ',
      },
      close: {
        onlyEndUsers: 'ಎಂಡ್ ಯೂಸರ್‌ಗಳು ಮಾತ್ರ ಮುಚ್ಚಬಹುದು',
        alreadyClosed: 'ಈಗಾಗಲೇ ಮುಚ್ಚಲಾಗಿದೆ',
        invalidStarRating: 'ಅಮಾನ್ಯ ನಕ್ಷತ್ರ ರೇಟಿಂಗ್ (1-5)',
        providerDidNotAccept: 'ಆಯ್ಕೆ ಮಾಡಿದ ಪೂರೈಕೆದಾರರು ಈ ವಿನಂತಿಯನ್ನು ಸ್ವೀಕರಿಸಲಿಲ್ಲ',
        failed: 'ಮುಚ್ಚುವಿಕೆ ವಿಫಲ',
      }
    },
    payment: {
      onlyEndUsers: 'ಎಂಡ್ ಯೂಸರ್‌ಗಳು ಮಾತ್ರ ಬೂಸ್ಟ್ ಮಾಡಬಹುದು',
      alreadyBoosted: 'ಕೆಲಸದ ವಿನಂತಿ ಈಗಾಗಲೇ ಬೂಸ್ಟ್ ಆಗಿದೆ',
      insufficientCredits: 'ಕ್ರೆಡಿಟ್ ಪಾಯಿಂಟ್‌ಗಳು ಸಾಕಾಗಿಲ್ಲ',
      boostFailed: 'ಬೂಸ್ಟ್ ವಿಫಲ',
    },
    subscription: {
      onlyProviders: 'ಸೇವಾ ಪೂರೈಕೆದಾರರು ಮಾತ್ರ ಚಂದಾದಾರರಾಗಬಹುದು',
      failed: 'ಚಂದಾದಾರಿಕೆ ವಿಫಲ',
    }
  }
};

export function ensureLocale(lang?: string | null): Locale {
  const code = (lang || '').slice(0, 2) as Locale;
  return supportedLocales.includes(code) ? code : 'en';
}

export function getReqLang(req: any): Locale {
  // Prefer authenticated user language
  const userLang = req?.user?.language as string | undefined;
  if (userLang) return ensureLocale(userLang);
  // Then explicit header or query
  const headerLang = (req.headers?.['x-language'] || req.headers?.['accept-language']) as string | undefined;
  if (headerLang) return ensureLocale(headerLang);
  const queryLang = (req.query?.lang || req.body?.language) as string | undefined;
  if (queryLang) return ensureLocale(queryLang);
  return 'en';
}

function getPath(obj: any, path: string): any {
  return path.split('.').reduce((acc: any, key: string) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

export function t(lang: Locale, key: string, params?: Record<string, any>): string {
  const dict = translations[lang] || translations.en;
  const str = getPath(dict, key) || getPath(translations.en, key) || key;
  if (typeof str === 'string') return interpolate(str, params);
  return String(str);
}

// Helper to send localized notifications based on recipient's language
export async function notifyUser(options: {
  userId: string;
  type: 'newRequest' | 'requestAccepted' | 'ratingPrompt' | 'boostPromotion' | 'autoClosed' | 'planPromotion';
  titleKey: string;
  messageKey: string;
  params?: Record<string, any>;
  data?: any;
}) {
  const u = await prisma.user.findUnique({ where: { id: options.userId } });
  const lang = ensureLocale(u?.language);
  const title = t(lang, options.titleKey, options.params);
  const message = t(lang, options.messageKey, options.params);
  const record = await pushNotification({
    userId: options.userId,
    type: options.type as any,
    title,
    message,
    data: options.data,
  } as any);
  // Fire-and-forget push send; do not block request
  sendExpoPushToUser(options.userId, title, message, options.data).catch((e) => console.warn('push send error', e));
  return record;
}
