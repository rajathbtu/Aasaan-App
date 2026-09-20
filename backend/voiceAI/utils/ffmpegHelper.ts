import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

export function startFfmpegForProvider(): ChildProcessWithoutNullStreams | null {
  try {
    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error',
      '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', '-',
      '-c:a', 'pcm_mulaw', '-f', 'mulaw', '-ar', '8000', '-ac', '1', '-flush_packets', '1', '-'
    ]);
    return ffmpeg;
  } catch (e) {
    return null;
  }
}
