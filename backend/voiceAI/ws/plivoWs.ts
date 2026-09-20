import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { callSessionManager } from '../models/callSessions';
import { CallSummary, TranscriptEntry } from '../services/callSummary';

// Plivo WebSocket adapter
export function attachPlivoWs(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws/plivo' });

  wss.on('connection', (ws, req) => {
    console.log('[Plivo WS] connection from', req.socket.remoteAddress);

    let callUuid: string | undefined;
    let streamId: string | undefined;
    const connectionId = randomUUID();
    const summary = process.env.CALL_SUMMARY_ENABLED === '1' ? new CallSummary() : undefined;
    let ended = false;
    // Stop/close/hangup share this connection's single finalization guard.
    // Create pluggable provider (OpenAI realtime by default, or Sarvam)
    const { createProvider } = require('../providers/factory');
    const provider = createProvider();
    provider.on('transcript', (entry: TranscriptEntry) => summary?.add(entry));

    // Per-connection ffmpeg process that converts OpenAI PCM@24000 -> mu-law@8000 for Plivo
    let ffmpeg: ChildProcessWithoutNullStreams | null = null;
    let ffmpegAvailable = true;
    let outputInterrupted = false;

    function discardTranscoder() {
      const process = ffmpeg;
      ffmpeg = null;
      ffmpegAvailable = true;
      if (process) {
        try { process.stdin.destroy(); } catch (e) {}
        try { process.kill(); } catch (e) {}
      }
    }

    provider.on('speech_started', () => {
      if (ended || ws.readyState !== WebSocket.OPEN || outputInterrupted) return;
      outputInterrupted = true;
      discardTranscoder();
      // Clear audio already queued at Plivo, not the caller's input buffer.
      ws.send(JSON.stringify({ event: 'clearAudio', streamId }), (err) => {
        if (err) console.error('[PLIVO] failed to clear playback', err);
      });
    });
    // Transcode the next agent response from a clean ffmpeg process.
    provider.on('response.started', () => { outputInterrupted = false; });

    function startFfmpeg() {
      if (ffmpeg) return ffmpeg;
      // input: s16le PCM at 24000 Hz mono (what OpenAI realtime currently emits)
      // output: mulaw (PCMU) 8kHz mono raw audio
      try {
        ffmpeg = spawn('ffmpeg', [
          '-hide_banner', '-loglevel', 'error',
          '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', '-',
          '-c:a', 'pcm_mulaw', '-f', 'mulaw', '-ar', '8000', '-ac', '1', '-flush_packets', '1', '-'
        ]);
        console.log('[ffmpeg] started pid=', ffmpeg.pid);
      } catch (err) {
        ffmpeg = null;
        ffmpegAvailable = false;
        console.error('[ffmpeg] spawn failed — ffmpeg not found. Install ffmpeg (brew install ffmpeg or apt install ffmpeg).', err);
        return null;
      }

      const currentProcess = ffmpeg;
      ffmpeg.stdin.on('error', (err) => {
        if (ffmpeg === currentProcess && !ended) console.error('[ffmpeg] stdin error', err);
      });
      ffmpeg.on('error', (err) => {
        if (ffmpeg !== currentProcess) return;
        ffmpegAvailable = false;
        console.error('[ffmpeg] spawn error', err);
      });
      ffmpeg.on('exit', (code, sig) => {
        if (ffmpeg !== currentProcess) return;
        ffmpegAvailable = false;
        console.log('[ffmpeg] exited', code, sig);
      });

      // when ffmpeg produces converted audio, send to Plivo as base64 media frames
      ffmpeg.stdout.on('data', (chunk: Buffer) => {
        try {
          // Don't send if WebSocket is closed
          if (ended || ws.readyState !== WebSocket.OPEN || outputInterrupted || ffmpeg !== currentProcess) return;
          const b64 = chunk.toString('base64');
          const out = JSON.stringify({ event: 'playAudio', media: { payload: b64, contentType: 'audio/x-mulaw', sampleRate: 8000 } });
          if (process.env.PLIVO_DEBUG === '1') console.log('[PLIVO] sending transcoded bytes=', chunk.length);
          ws.send(out, (err) => {
            if (err) console.error('[PLIVO] ws.send error sending transcoded audio', err);
          });
        } catch (e) {
          console.error('[PLIVO] failed to send transcoded audio', e);
        }
      });

      ffmpeg.stderr?.on('data', (d) => {
        if (process.env.OPENAI_DEBUG === '1') console.error('[ffmpeg]', d.toString());
      });

      console.log('[PLIVO] ffmpeg process started, pid=', ffmpeg.pid);
      return ffmpeg;
    }

    provider.on('open', () => console.log('[PROVIDER] open'));
    provider.on('error', (e: Error) => console.error('[PROVIDER] error', e));
    provider.on('close', () => console.log('[PROVIDER] closed'));
    provider.on('audio', (b64: string) => {
      if (ended || ws.readyState !== WebSocket.OPEN || outputInterrupted) return;
      // OpenAI emits PCM@24000 (s16le). Transcode to mu-law@8000 before sending to Plivo.
      try {
        const raw = Buffer.from(b64, 'base64');
        if (process.env.OPENAI_DEBUG === '1') console.log('[PROVIDER] audio delta bytes=', raw.length);
        const ff = startFfmpeg();
        if (!ff || !ff.stdin || !ffmpegAvailable) {
          console.warn('[PLIVO] ffmpeg not available; cannot transcode OpenAI audio — install ffmpeg and restart the server');
          return;
        }
        // write decoded PCM into ffmpeg stdin (backpressure may occur)
        const ok = ff.stdin.write(raw);
        if (!ok) {
          // If stdin buffers up, log backpressure warning (ffmpeg should keep up normally)
          console.warn('[ffmpeg] stdin backpressure');
        }
      } catch (e) {
        console.error('[OPENAI] failed to process audio delta', e);
      }
    });

    // surface websocket errors for diagnosis
    ws.on('error', (err) => {
      console.error('[Plivo WS] client ws error', err);
    });

    wss.on('error', (err) => {
      console.error('[Plivo WS] server ws error', err);
    });

    provider.connect();
    const MIN_COMMIT_BYTES = Number(process.env.MIN_OPENAI_COMMIT_BYTES || '1600'); // ~200ms @ 8kHz mu-law (was 800)
    let openaiReady = false;
    let audioBufferParts: string[] = [];
    let audioBufferBytes = 0;

    // Helper to flush buffered audio to OpenAI (append only - let OpenAI server-side VAD handle commit/response)
    async function flushAudioBuffer() {
      // Only flush if we have actual audio data
      if (audioBufferBytes < MIN_COMMIT_BYTES) {
        if (process.env.PLIVO_DEBUG === '1') {
          console.log('[PLIVO] flushAudioBuffer: insufficient audio buffered', { audioBufferBytes, MIN_COMMIT_BYTES });
        }
        return false;
      }
      
      try {
        // Forward mu-law parts to provider; provider implementations handle conversion/append
        for (const part of audioBufferParts) {
          try { provider.sendInputAudio(part); } catch (err) { console.error('[PLIVO] provider.sendInputAudio error', err); }
        }
        // Clear buffer AFTER forwarding
        audioBufferParts = [];
        audioBufferBytes = 0;
        if (process.env.PLIVO_DEBUG === '1') console.log('[PLIVO] flushAudioBuffer: forwarded audio to provider');
        return true;
      } catch (e) {
        console.error('[PLIVO] error in flushAudioBuffer', e);
        return false;
      }
    }

    // Helper: decode mu-law byte to 16-bit linear PCM sample
    function muLawDecodeByte(muLawByte: number): number {
      const u = ~muLawByte & 0xff;
      const sign = u & 0x80;
      const exponent = (u >> 4) & 0x07;
      const mantissa = u & 0x0f;
      let sample = ((mantissa << 3) + 0x84) << exponent;
      sample = sign ? (0x84 - sample) : (sample - 0x84);
      return sample;
    }

    // Convert mu-law@8k mono Buffer -> s16le@24000 mono Buffer by simple upsample x3 (nearest)
    function mulawToPcm24k(muBuf: Buffer): Buffer {
      const outSamples = muBuf.length * 3; // upsample 8k -> 24k
      const out = Buffer.alloc(outSamples * 2); // 16-bit samples
      let outIdx = 0;
      for (let i = 0; i < muBuf.length; i++) {
        const s = muLawDecodeByte(muBuf[i]);
        // clamp to int16
        const v = Math.max(-32768, Math.min(32767, s));
        // write three copies
        out.writeInt16LE(v, outIdx); outIdx += 2;
        out.writeInt16LE(v, outIdx); outIdx += 2;
        out.writeInt16LE(v, outIdx); outIdx += 2;
      }
      return out;
    }

    function finalizeCallSummary() {
      if (ended) return;
      ended = true;
      if (callUuid) callSessionManager.update(callUuid, { status: 'ended' });
      // Allow already committed transcription events to arrive. This is bounded,
      // not a guarantee that all in-flight speech will finish transcribing.
      if (summary) {
        setTimeout(() => {
          provider.close();
          void summary.finish(callUuid || connectionId);
        }, 1500);
      } else provider.close();
      audioBufferParts = [];
      audioBufferBytes = 0;
    }

    let streamStarted = false;
    let greetingRequested = false;
    function requestGreeting() {
      if (ended || !streamStarted || !openaiReady || greetingRequested || ws.readyState !== WebSocket.OPEN) return;
      greetingRequested = true;
      provider.requestResponse();
    }

    provider.on('open', () => {
      openaiReady = true;
      requestGreeting();
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const ev = msg.event || msg.type;
        if (ended) return;
        if (ev === 'start') {
          if (streamStarted) return;
          // Plivo start event contains CallUUID
          streamId = msg.start?.streamId || msg.start?.StreamID || msg.streamId || undefined;
          callUuid = msg.start?.call_uuid || msg.start?.CallUUID || msg.CallUUID || msg.call_uuid || msg.from || undefined;
          if (!callUuid && msg.call_uuid) callUuid = msg.call_uuid;
          if (callUuid) {
            const runtime = { close: () => {
              finalizeCallSummary();
              ws.close();
            } };
            if (callSessionManager.get(callUuid)) {
              callSessionManager.update(callUuid, { status: 'in-progress', runtime });
            } else {
              callSessionManager.create({ callUuid, createdAt: new Date(), status: 'in-progress', runtime });
            }
            console.log('[PLIVO] stream start', { callUuid });
          }
          streamStarted = true;
          requestGreeting();
        } else if (ev === 'media') {
          // Plivo media payload: base64 mulaw
          const payload = msg.media && (msg.media.payload || msg.media.content || msg.media.data);
          if (payload) {
            try {
              const rawBytes = Buffer.from(payload, 'base64').length;
              if (process.env.PLIVO_DEBUG === '1') console.log('[PLIVO] media received bytes=', rawBytes);
              // Buffer incoming mu-law chunks until we have enough audio for the provider to accept
              audioBufferParts.push(payload);
              audioBufferBytes += rawBytes;
              if (audioBufferBytes >= MIN_COMMIT_BYTES && openaiReady) flushAudioBuffer();
            } catch (err) {
              console.error('[PLIVO] error forwarding media to OpenAI', err);
            }
          } else {
            console.log('[PLIVO] media event without payload', msg.media && Object.keys(msg.media));
          }
        } else if (ev === 'stop') {
          console.log('[PLIVO] stream stop', { callUuid });
          finalizeCallSummary();
        } else {
          // other events
        }
      } catch (e) {
        // binary frames? ignore or log
        // console.error('[PLIVO WS] failed to parse message', e);
      }
    });

    ws.on('close', () => {
      console.log('[Plivo WS] closed', callUuid);
      finalizeCallSummary();
      if (callUuid) callSessionManager.delete(callUuid);
      
      // Let ffmpeg finish sending any remaining audio output before killing
      const ffmpegProcess = ffmpeg;
      ffmpeg = null;
      if (ffmpegProcess) {
        try { 
          ffmpegProcess.stdin.end(); // Signal no more input
          // Give ffmpeg a moment to flush output, then kill
          setTimeout(() => {
            try { ffmpegProcess.kill(); } catch (e) {}
          }, 500);
        } catch (e) {}
      }
    });
  });
}
