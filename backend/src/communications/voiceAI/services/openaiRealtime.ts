import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface OpenAIRealtimeOptions {
  apiKey: string;
  model: string;
  instructions?: string;
  transcriptLogging?: boolean;
  collectTranscripts?: boolean;
  getCallId?: () => string;
}

export class OpenAIRealtime extends EventEmitter {
  private ws?: WebSocket;
  private opts: OpenAIRealtimeOptions;
  private loggedTranscripts = new Set<string>();
  private activeResponseId?: string;
  private cancelledResponseIds = new Set<string>();

  private logTranscript(msg: any, speaker: 'caller' | 'Priya', text: unknown) {
    if (typeof text !== 'string' || !text.trim()) return;
    const key = `${speaker}:${msg.item_id}:${msg.content_index ?? 0}`;
    if (msg.item_id && this.loggedTranscripts.has(key)) return;
    if (msg.item_id) {
      this.loggedTranscripts.add(key);
      if (this.loggedTranscripts.size > 1000) {
        this.loggedTranscripts.delete(this.loggedTranscripts.values().next().value!);
      }
    }
    const entry = { speaker, text: text.trim() };
    this.emit('transcript', entry);
    if (this.opts.transcriptLogging) console.log('[CALL TRANSCRIPT]', JSON.stringify(entry));
  }

  private handleTranscriptEvent(msg: any) {
    if (!this.opts.transcriptLogging && !this.opts.collectTranscripts) return;
    if (msg.type === 'conversation.item.input_audio_transcription.completed') {
      this.logTranscript(msg, 'caller', msg.transcript);
    } else if (msg.type === 'response.output_audio_transcript.done' || msg.type === 'response.audio_transcript.done') {
      this.logTranscript(msg, 'Priya', msg.transcript);
    } else if (msg.type === 'response.done') {
      // Fallback for servers that include transcripts only in the final response.
      for (const item of Array.isArray(msg.response?.output) ? msg.response.output : []) {
        if (item.role !== 'assistant') continue;
        for (const [index, content] of (Array.isArray(item.content) ? item.content : []).entries()) {
          if (content.type === 'audio' || content.type === 'output_audio') {
            this.logTranscript({ ...msg, item_id: item.id, content_index: index, response_id: msg.response.id }, 'Priya', content.transcript);
          }
        }
      }
    }
    if (msg.type === 'error' || msg.type === 'conversation.item.input_audio_transcription.failed') {
      // Avoid dumping server messages that can echo instructions or personal data.
      console.error('[CALL TRANSCRIPT ERROR]', JSON.stringify({
        timestamp: new Date().toISOString(), callId: this.opts.getCallId?.() ?? 'unknown',
        event: msg.type, itemId: msg.item_id, code: msg.error?.code, errorType: msg.error?.type,
      }));
    }
  }

  constructor(opts: OpenAIRealtimeOptions) {
    super();
    this.opts = opts;
  }

  connect() {
    const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(this.opts.model)}`;
    this.ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
      },
    } as any);

    this.ws.on('open', () => {
      console.log('[OPENAI] websocket opened to', url);
      if (this.opts.instructions || this.opts.transcriptLogging || this.opts.collectTranscripts) {
        this.sendJson({
          type: 'session.update',
          session: {
            type: 'realtime',
            instructions: this.opts.instructions,
            audio: {
              output: { voice: 'shimmer' },
              input: {
                // The WebSocket adapter owns cancellation and playback clearing.
                turn_detection: { type: 'server_vad', create_response: true, interrupt_response: false },
                ...(this.opts.transcriptLogging || this.opts.collectTranscripts ? {
                  transcription: { model: 'gpt-4o-mini-transcribe', language: 'hi' },
                } : {}),
              },
            },
          },
        });
      }
      this.emit('open');
    });

    this.ws.on('message', (data) => {
      // Messages can be JSON or binary. Try JSON first.
      try {
        const text = data.toString();
        const msg = JSON.parse(text);
        this.handleTranscriptEvent(msg);
        this.emit('message', msg);

        // Debug logging (controlled by env var)
        if (process.env.OPENAI_DEBUG === '1') {
          try { console.log('[OPENAI MSG]', JSON.stringify(msg).slice(0, 2000)); } catch (e) {}
        }

        const t = msg.type || msg.event || msg.name || '';
        if (t === 'response.created') {
          this.activeResponseId = msg.response?.id;
          this.emit('response.started', msg);
        } else if (t === 'input_audio_buffer.speech_started') {
          this.cancelResponse();
          this.emit('speech_started', msg);
        } else if (t === 'response.done' && msg.response?.id === this.activeResponseId) {
          this.activeResponseId = undefined;
        }

        // Try to extract any text output deltas
        const outText = msg.output_text || msg.text || (msg.response && msg.response.output_text) || (msg.delta && (msg.delta.output_text || msg.delta.content));
        if (outText) {
          this.emit('output_text', outText);
        }

        // Only audio delta events contain playable base64 audio. Text and
        // transcript events also use `delta`, but must never enter the PCM path.
        if ((t === 'response.output_audio.delta' || t === 'response.audio.delta') &&
            typeof msg.delta === 'string' && msg.delta.length > 0 &&
            !this.cancelledResponseIds.has(msg.response_id)) {
          this.emit('audio', msg.delta);
        }

        if (t === 'response.completed' || t === 'response.done' || t === 'response.finished' || t === 'response.output_text.delta') {
          this.emit('response.completed', msg);
        }
      } catch (e) {
        // Could be binary audio
        this.emit('binary', data);
      }
    });

    this.ws.on('close', () => this.emit('close'));
    this.ws.on('error', (err) => this.emit('error', err));
  }

  sendJson(obj: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(obj));
  }

  appendAudio(base64Chunk: string) {
    this.sendJson({ type: 'input_audio_buffer.append', audio: base64Chunk });
  }

  commit() {
    this.sendJson({ type: 'input_audio_buffer.commit' });
  }

  requestResponse(instructions?: string) {
    const payload: any = { type: 'response.create' };
    if (instructions) payload.response = { instructions };
    this.sendJson(payload);
  }

  cancelResponse() {
    const responseId = this.activeResponseId;
    if (!responseId || this.cancelledResponseIds.has(responseId)) return;
    this.cancelledResponseIds.add(responseId);
    if (this.cancelledResponseIds.size > 1000) {
      this.cancelledResponseIds.delete(this.cancelledResponseIds.values().next().value!);
    }
    this.activeResponseId = undefined;
    this.sendJson({ type: 'response.cancel', response_id: responseId });
  }

  close() {
    try { this.ws?.close(); } catch (e) {}
  }
}

export default OpenAIRealtime;
