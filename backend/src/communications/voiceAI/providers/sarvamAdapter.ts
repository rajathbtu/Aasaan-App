import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { Provider, ProviderOptions } from './types';

// Sarvam adapter: STT websocket + TTS websocket.
class SarvamAdapter extends EventEmitter implements Provider {
  private sttWs?: WebSocket;
  private ttsWs?: WebSocket;
  private opts: Partial<ProviderOptions>;
  private buffering = false;

  constructor(opts: Partial<ProviderOptions>) {
    super();
    this.opts = opts;
  }

  connect() {
    // Connect STT socket
    const sttUrl = this.opts.sarvamSttUrl || 'wss://api.sarvam.ai/speech-to-text-realtime/ws';
    const headers: any = { 'Api-Subscription-Key': this.opts.sarvamApiKey || process.env.SARVAM_API_KEY || '' };
    this.sttWs = new WebSocket(sttUrl, { headers } as any);
    this.sttWs.on('open', () => this.emit('open'));
    this.sttWs.on('message', (data) => this.handleSttMessage(data));
    this.sttWs.on('error', (e) => this.emit('error', e));
    this.sttWs.on('close', () => this.emit('close'));

    // Prepare TTS socket (connect lazily when first request)
  }

  close() {
    try { this.sttWs?.close(); } catch (e) {}
    try { this.ttsWs?.close(); } catch (e) {}
  }

  sendInputAudio(muLawBase64: string) {
    // Sarvam STT accepts s16le@8000 or wav; decode mu-law -> s16le@8000 and send base64
    try {
      const mu = Buffer.from(muLawBase64, 'base64');
      const pcm8 = mulawToPcm8k(mu);
      const b64 = pcm8.toString('base64');
      const msg = JSON.stringify({ event: 'audio_input', audio: b64 });
      this.sttWs?.send(msg, (err) => { if (err) this.emit('error', err); });
    } catch (e) {
      this.emit('error', e);
    }
  }

  async requestResponse(_instructions?: string) {
    // Sarvam Voice Agents owns the conversational response when the
    // deployment is used directly. This backend adapter only handles the
    // realtime audio transport and does not call a separate LLM provider.
    this.emit('response.completed', { text: '' });
  }

  cancelResponse() {
    // Not implemented for Sarvam TTS streaming in this MVP
  }

  private handleSttMessage(data: WebSocket.Data) {
    try {
      const text = data.toString();
      const msg = JSON.parse(text);
      const t = msg.type || msg.event || '';
      if (t === 'transcript.partial') {
        this.emit('transcript', { speaker: 'caller', text: msg.transcript, partial: true });
      } else if (t === 'transcript.final') {
        this.emit('transcript', { speaker: 'caller', text: msg.transcript, partial: false });
      } else if (t === 'vad') {
        this.emit('speech_started');
      }
    } catch (e) {
      // ignore non-json or binary
    }
  }

  private async streamTextToTts(text: string) {
    // Ensure TTS websocket connected
    if (!this.ttsWs || this.ttsWs.readyState !== WebSocket.OPEN) {
      await this.connectTts();
    }
    if (!this.ttsWs) throw new Error('TTS websocket unavailable');

    return new Promise<void>((resolve, reject) => {
      const onMessage = (data: WebSocket.Data) => {
        // Sarvam may send binary or JSON with audio base64
        if (data instanceof Buffer) {
          // Assume it's raw pcm s16le@24000
          const b64 = data.toString('base64');
          this.emit('audio', b64);
          return;
        }
        try {
          const msg = JSON.parse(data.toString());
          if (msg.event === 'audio_chunk' && msg.audio) {
            // msg.audio is base64 PCM@24000
            this.emit('audio', msg.audio);
          } else if (msg.event === 'synthesis_complete') {
            this.ttsWs?.off('message', onMessage);
            resolve();
          }
        } catch (e) {
          // ignore
        }
      };
      if (!this.ttsWs) throw new Error('TTS websocket unavailable');
      this.ttsWs.on('message', onMessage);
      const payload = { event: 'synthesize', text, voice: this.opts.sarvamVoice || 'default', codec: process.env.SARVAM_TTS_CODEC || 'linear16', sampleRate: Number(process.env.SARVAM_TTS_RATE || 24000) };
      this.ttsWs.send(JSON.stringify(payload), (err) => { if (err) reject(err); });
    });
  }

  private async connectTts() {
    const ttsUrl = this.opts.sarvamTtsUrl || 'wss://api.sarvam.ai/text-to-speech/ws';
    const headers: any = { 'Api-Subscription-Key': this.opts.sarvamApiKey || process.env.SARVAM_API_KEY || '' };
    this.ttsWs = new WebSocket(ttsUrl, { headers } as any);
    return new Promise<void>((resolve, reject) => {
      this.ttsWs?.on('open', () => resolve());
      this.ttsWs?.on('error', (e) => reject(e));
    });
  }
}

// Helpers: mu-law decode to s16le@8000
function muLawDecodeByte(muLawByte: number): number {
  const u = ~muLawByte & 0xff;
  const sign = u & 0x80;
  const exponent = (u >> 4) & 0x07;
  const mantissa = u & 0x0f;
  let sample = ((mantissa << 3) + 0x84) << exponent;
  sample = sign ? (0x84 - sample) : (sample - 0x84);
  return sample;
}

function mulawToPcm8k(muBuf: Buffer): Buffer {
  const out = Buffer.alloc(muBuf.length * 2);
  let outIdx = 0;
  for (let i = 0; i < muBuf.length; i++) {
    const s = muLawDecodeByte(muBuf[i]);
    const v = Math.max(-32768, Math.min(32767, s));
    out.writeInt16LE(v, outIdx); outIdx += 2;
  }
  return out;
}

export default SarvamAdapter;
