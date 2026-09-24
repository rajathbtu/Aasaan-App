import { EventEmitter } from 'events';

export type ProviderEvents = 'open' | 'audio' | 'transcript' | 'response.started' | 'response.completed' | 'speech_started' | 'error' | 'close';

export interface Provider extends EventEmitter {
  connect(): void;
  close(): void;
  sendInputAudio(muLawBase64: string): void; // incoming Plivo mu-law frame (base64)
  requestResponse(instructions?: string): void; // ask provider to generate a response (triggers audio events)
  cancelResponse?(): void;
}

export interface ProviderOptions {
  provider?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  sarvamApiKey?: string;
  sarvamSttUrl?: string;
  sarvamTtsUrl?: string;
  sarvamVoice?: string;
}

export default Provider;
