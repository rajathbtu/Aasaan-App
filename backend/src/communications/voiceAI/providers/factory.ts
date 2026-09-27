import SarvamAdapter from './sarvamAdapter';
import { Provider, ProviderOptions } from './types';

/** The voice runtime currently supports Sarvam only. */
export function createProvider(opts: Partial<ProviderOptions> = {}): Provider {
  return new SarvamAdapter({
    sarvamApiKey: process.env.SARVAM_API_KEY || opts.sarvamApiKey,
    sarvamSttUrl: process.env.SARVAM_STT_URL || opts.sarvamSttUrl || 'wss://api.sarvam.ai/speech-to-text-realtime/ws',
    sarvamTtsUrl: process.env.SARVAM_TTS_URL || opts.sarvamTtsUrl || 'wss://api.sarvam.ai/text-to-speech/ws',
    sarvamVoice: process.env.SARVAM_VOICE || opts.sarvamVoice || 'default',
  } as any);
}
