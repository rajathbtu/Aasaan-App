import { EventEmitter } from 'events';

export type ProviderEvents = 'open' | 'audio' | 'transcript' | 'response.started' | 'response.completed' | 'speech_started' | 'error' | 'close';

export interface Provider extends EventEmitter {
  connect(): void;
  close(): void;
  sendInputAudio(muLawBase64: string): void;
  requestResponse(instructions?: string): void;
  cancelResponse?(): void;
}

export interface ProviderOptions {
  sarvamApiKey?: string;
  sarvamSttUrl?: string;
  sarvamTtsUrl?: string;
  sarvamVoice?: string;
}

export default Provider;
