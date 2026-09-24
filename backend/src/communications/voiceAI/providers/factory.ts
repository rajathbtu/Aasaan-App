import OpenAIRealtime from '../services/openaiRealtime';
import OpenAIAdapter from './openaiAdapter';
import SarvamAdapter from './sarvamAdapter';
import { Provider, ProviderOptions } from './types';

export function createProvider(opts: Partial<ProviderOptions> = {}): Provider {
  const provider = (process.env.VOICE_PROVIDER || opts.provider || 'openai').toLowerCase();
  if (provider === 'sarvam') {
    return new SarvamAdapter({
      sarvamApiKey: process.env.SARVAM_API_KEY || opts.sarvamApiKey,
      sarvamSttUrl: process.env.SARVAM_STT_URL || opts.sarvamSttUrl || 'wss://api.sarvam.ai/speech-to-text-realtime/ws',
      sarvamTtsUrl: process.env.SARVAM_TTS_URL || opts.sarvamTtsUrl || 'wss://api.sarvam.ai/text-to-speech/ws',
      sarvamVoice: process.env.SARVAM_VOICE || opts.sarvamVoice || 'default',
    } as any);
  }

  // default: openai realtime adapter
  return new OpenAIAdapter({
    openaiApiKey: process.env.OPENAI_API_KEY || opts.openaiApiKey || '',
    openaiModel: process.env.OPENAI_REALTIME_MODEL || opts.openaiModel || 'gpt-realtime-2.1-mini',
  } as any);
}
