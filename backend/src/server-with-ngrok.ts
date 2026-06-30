import dotenv from 'dotenv';
// Load environment variables from .env as early as possible
dotenv.config();

import { spawn } from 'child_process';
import path from 'path';
import http from 'http';
import app from './app';
import { getLanIPv4Addresses, getLanAccessUrls } from './utils/network';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer(app);

function startNgrokTunnel() {
  const ngrokBin = path.resolve(__dirname, '..', 'node_modules', 'ngrok', 'bin', 'ngrok.exe');
  const args = ['http', String(PORT), '--log=stdout'];

  if (process.env.NGROK_AUTHTOKEN) {
    args.push('--authtoken', process.env.NGROK_AUTHTOKEN);
  }
  if (process.env.NGROK_REGION) {
    args.push('--region', process.env.NGROK_REGION);
  }
  if (process.env.NGROK_HOSTNAME) {
    args.push('--hostname', process.env.NGROK_HOSTNAME);
  }

  const child = spawn(ngrokBin, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

  child.stdout.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    console.log(`[Tunnel] ${text.trim()}`);
  });

  child.stderr.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    console.error(`[Tunnel] ${text.trim()}`);
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[Tunnel] ngrok exited with code ${code}`);
    }
  });
}

async function start() {
  server.listen({ port: Number(PORT), host: HOST }, async () => {
    const lanIPs = getLanIPv4Addresses();
    console.log(`Aasaan backend is running on http://${HOST}:${PORT}`);

    if (process.env.NODE_ENV !== 'production') {
      if (lanIPs.length) {
        console.log('[Dev] Reachable from other devices at:');
        for (const url of getLanAccessUrls(PORT)) {
          console.log(`       → ${url}`);
        }
      } else {
        console.log('[Dev] No external IPv4 address detected. Are you connected to Wi‑Fi/LAN?');
      }
    }

    startNgrokTunnel();
    console.log(`[Tunnel] Started ngrok tunnel process for port ${PORT}.`);
  });
}

start().catch((error) => {
  console.error('[Tunnel] Startup failed:', error);
  process.exit(1);
});