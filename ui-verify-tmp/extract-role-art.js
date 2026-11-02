/**
 * Extracts the base64-embedded PNG payloads from the user-supplied role
 * illustration SVG wrappers (frontend/src/assets/icons/consumer.svg and
 * service_expert.svg) and writes them as real PNG files for RN Image use.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const jobs = [
  { svg: 'frontend/src/assets/icons/consumer.svg', out: 'ui-verify-tmp/role-consumer-full.png' },
  { svg: 'frontend/src/assets/icons/service_expert.svg', out: 'ui-verify-tmp/role-service-expert-full.png' },
];

for (const job of jobs) {
  const svg = fs.readFileSync(path.join(ROOT, job.svg), 'utf8');
  const matches = [...svg.matchAll(/(?:xlink:)?href="data:image\/png;base64,([^"]+)"/g)];
  console.log(path.basename(job.svg), '— embedded images found:', matches.length);
  if (matches.length < 1) throw new Error('no embedded PNG in ' + job.svg);
  // Pick the largest payload — the main artwork (extra ones are thumbnails/metadata).
  const best = matches.reduce((a, b) => (b[1].length > a[1].length ? b : a));
  console.log('  payload sizes:', matches.map(m => Math.round(m[1].length / 1024) + 'KB').join(', '), '→ using largest');
  const buf = Buffer.from(best[1], 'base64');
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  console.log('  decoded bytes:', buf.length, 'png magic:', isPng);
  if (!isPng) throw new Error('payload is not a PNG');
  // PNG dims at offsets 16/20
  console.log('  dimensions:', buf.readUInt32BE(16) + 'x' + buf.readUInt32BE(20));
  fs.writeFileSync(path.join(ROOT, job.out), buf);
  console.log('  wrote', job.out);
}
