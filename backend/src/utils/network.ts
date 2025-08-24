import os from 'os';

// Return non-internal IPv4 addresses (LAN IPs)
export function getLanIPv4Addresses(): string[] {
  const nets = os.networkInterfaces();
  const results: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
      const isIPv4 = net.family === familyV4Value || net.family === 'IPv4';
      if (isIPv4 && !net.internal && net.address) {
        results.push(net.address);
      }
    }
  }
  return Array.from(new Set(results));
}

// Convenience: format reachable URLs for a given port
export function getLanAccessUrls(port: number | string): string[] {
  const p = Number(port);
  return getLanIPv4Addresses().map(ip => `http://${ip}:${p}`);
}
