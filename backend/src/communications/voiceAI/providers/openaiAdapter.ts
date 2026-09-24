import { EventEmitter } from 'events';
import OpenAIRealtime from '../services/openaiRealtime';
import VOICE_AGENT_SYSTEM_PROMPT from '../config/openaiPrompt';
import { Provider, ProviderOptions } from './types';

class OpenAIAdapter extends EventEmitter implements Provider {
  private client: OpenAIRealtime;

  constructor(opts: Partial<ProviderOptions>) {
    super();
    this.client = new OpenAIRealtime({
      apiKey: opts.openaiApiKey || '',
      model: opts.openaiModel || 'gpt-realtime-2.1-mini',
      instructions: VOICE_AGENT_SYSTEM_PROMPT,
      transcriptLogging: process.env.CALL_TRANSCRIPT_LOGGING === '1',
      collectTranscripts: false,
    });

    // Proxy events
    this.client.on('open', () => this.emit('open'));
    this.client.on('audio', (b64) => this.emit('audio', b64));
    this.client.on('transcript', (t) => this.emit('transcript', t));
    this.client.on('response.started', (m) => this.emit('response.started', m));
    this.client.on('response.completed', (m) => this.emit('response.completed', m));
    this.client.on('speech_started', (m) => this.emit('speech_started', m));
    this.client.on('error', (e) => this.emit('error', e));
    this.client.on('close', () => this.emit('close'));
  }

  connect() { this.client.connect(); }
  close() { this.client.close(); }

  sendInputAudio(muLawBase64: string) {
    // OpenAIRealtime expects s16le@24000 base64. Convert mu-law@8k -> s16le@24k here.
    // Reuse plivoWs conversion when provider is used directly; for simplicity we mirror old behavior.
    const mu = Buffer.from(muLawBase64, 'base64');
    // lightweight conversion: decode mu-law -> s16le@8k then upsample x3
    const pcm24 = mulawToPcm24k(mu);
    this.client.appendAudio(pcm24.toString('base64'));
    // Let plivoWs or other orchestrator call commit when appropriate
  }

  requestResponse(instructions?: string) { this.client.requestResponse(instructions); }
  cancelResponse() { this.client.cancelResponse(); }

  // helper: mu-law -> s16le@24k (copied from plivoWs implementation)
}

// mu-law decode helper (copied minimal implementation)
function muLawDecodeByte(muLawByte: number): number {
  const u = ~muLawByte & 0xff;
  const sign = u & 0x80;
  const exponent = (u >> 4) & 0x07;
  const mantissa = u & 0x0f;
  let sample = ((mantissa << 3) + 0x84) << exponent;
  sample = sign ? (0x84 - sample) : (sample - 0x84);
  return sample;
}

function mulawToPcm24k(muBuf: Buffer): Buffer {
  const outSamples = muBuf.length * 3;
  const out = Buffer.alloc(outSamples * 2);
  let outIdx = 0;
  for (let i = 0; i < muBuf.length; i++) {
    const s = muLawDecodeByte(muBuf[i]);
    const v = Math.max(-32768, Math.min(32767, s));
    out.writeInt16LE(v, outIdx); outIdx += 2;
    out.writeInt16LE(v, outIdx); outIdx += 2;
    out.writeInt16LE(v, outIdx); outIdx += 2;
  }
  return out;
}

export default OpenAIAdapter;
