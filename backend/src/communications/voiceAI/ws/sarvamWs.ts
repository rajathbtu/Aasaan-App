import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createProvider } from '../providers/factory';
import { startFfmpegForProvider } from '../utils/ffmpegHelper';

// Sarvam realtime WebSocket transport. The Sarvam Voice Agents deployment
// sends JSON messages using the start/media/stop event shape.
export function attachSarvamWs(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws/sarvam' });
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('[Sarvam WS] connection from', req.socket.remoteAddress);

    const provider = createProvider();

    let ffmpeg = startFfmpegForProvider();

    ws.on('message', async (data) => {
      try {
        const text = data.toString();
        const msg = JSON.parse(text);
        if (msg.event === 'start') {
          console.log('[SARVAM] stream start', { callUuid: msg.call_uuid || msg.callId });
        } else if (msg.event === 'media' && msg.media && msg.media.payload) {
          // Sarvam sends base64 mu-law audio frames.
          provider.sendInputAudio(msg.media.payload);
        } else if (msg.event === 'stop') {
          console.log('[SARVAM] stream stop', { callUuid: msg.call_uuid || msg.callId });
        }
      } catch (e) {
        // Not JSON or unsupported format; ignore
      }
    });

    // When provider emits audio, transcode and forward to Sarvam WS
    provider.on('audio', (b64pcm24k: string) => {
      if (!ffmpeg) {
        ffmpeg = startFfmpegForProvider();
      }
      if (!ffmpeg) return;
      // Write raw PCM@24000 (base64) into ffmpeg stdin
      try {
        const chunk = Buffer.from(b64pcm24k, 'base64');
        ffmpeg.stdin.write(chunk);
      } catch (err) {
        console.error('[SARVAM] error writing to ffmpeg', err);
      }
    });

    // ffmpeg stdout -> mu-law@8k raw frames; send as base64 media frames
    if (ffmpeg && ffmpeg.stdout) {
      ffmpeg.stdout.on('data', (chunk: Buffer) => {
        try {
          const b64 = chunk.toString('base64');
          const play = JSON.stringify({ event: 'playAudio', media: { payload: b64, contentType: 'audio/x-mulaw', sampleRate: 8000 } });
          if (ws.readyState === WebSocket.OPEN) ws.send(play, (err) => { if (err) console.error('[SARVAM] ws.send error', err); });
        } catch (err) {
          console.error('[SARVAM] failed to send transcoded audio', err);
        }
      });
    }

    ws.on('close', () => {
      console.log('[Sarvam WS] closed');
      if (ffmpeg) {
        try { ffmpeg.kill('SIGKILL'); } catch {};
      }
      try { provider.close(); } catch {}
    });
  });

  wss.on('error', (err) => console.error('[Sarvam WS] server ws error', err));
}
