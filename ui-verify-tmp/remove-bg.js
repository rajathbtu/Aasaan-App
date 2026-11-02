/**
 * Removes the outer white background from the role illustration PNGs:
 * decodes the full-res extracted images, flood-fills "near-white neutral"
 * pixels connected to the image border (only the outer background — enclosed
 * whites like the t-shirt, chart card and speech bubble are preserved),
 * sets them to transparent, and re-encodes as RGBA PNGs.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function decodePng(file) {
  const b = fs.readFileSync(file);
  let off = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idats = [];
  while (off < b.length) {
    const len = b.readUInt32BE(off);
    const type = b.toString('ascii', off + 4, off + 8);
    const data = b.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idats.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8 || interlace !== 0) throw new Error(`unsupported ${file}`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  const paeth = (a, bb, c) => {
    const p = a + bb - c, pa = Math.abs(p - a), pb = Math.abs(p - bb), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const rawv = raw[src + x];
      const left = x >= channels ? out[dst + x - channels] : 0;
      const up = y > 0 ? out[dst + x - stride] : 0;
      const ul = y > 0 && x >= channels ? out[dst + x - stride - channels] : 0;
      let v;
      if (filter === 0) v = rawv;
      else if (filter === 1) v = rawv + left;
      else if (filter === 2) v = rawv + up;
      else if (filter === 3) v = rawv + ((left + up) >> 1);
      else v = rawv + paeth(left, up, ul);
      out[dst + x] = v & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

function encodeRgbaPng(width, height, rgba, outFile) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(outFile, png);
}

const jobs = [
  { in: 'ui-verify-tmp/role-consumer-full.png', out: 'ui-verify-tmp/role-consumer-transparent.png' },
  { in: 'ui-verify-tmp/role-service-expert-full.png', out: 'ui-verify-tmp/role-service-expert-transparent.png' },
];

const NEUTRAL_MIN = 230;   // all channels >= this
const NEUTRAL_SPREAD = 18; // max-min <= this → "near-white neutral"

for (const job of jobs) {
  const img = decodePng(path.join(ROOT, job.in));
  const { width, height } = img;
  const src = img.data;
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = src[i * img.channels];
    rgba[i * 4 + 1] = src[i * img.channels + 1];
    rgba[i * 4 + 2] = src[i * img.channels + 2];
    rgba[i * 4 + 3] = img.channels === 4 ? src[i * img.channels + 3] : 255;
  }

  const isBgLike = (i) => {
    if (rgba[i * 4 + 3] === 0) return true;
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    return mn >= NEUTRAL_MIN && (mx - mn) <= NEUTRAL_SPREAD;
  };

  // Flood fill from all border pixels through bg-like pixels.
  const removed = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (!removed[idx] && isBgLike(idx)) { removed[idx] = 1; stack.push(idx); }
  };
  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }
  while (stack.length) {
    const idx = stack.pop();
    const x = idx % width, y = (idx / width) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }

  let removedCount = 0;
  for (let i = 0; i < width * height; i++) {
    if (removed[i]) { rgba[i * 4 + 3] = 0; removedCount++; }
  }

  // 1px feather: pixels adjacent to a removed pixel get partial alpha
  // based on how close to white they are (softens the cutout edge).
  const alphaAdjust = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (removed[idx]) continue;
      const touches =
        (x > 0 && removed[idx - 1]) || (x < width - 1 && removed[idx + 1]) ||
        (y > 0 && removed[idx - width]) || (y < height - 1 && removed[idx + width]);
      if (!touches) continue;
      const r = rgba[idx * 4], g = rgba[idx * 4 + 1], b = rgba[idx * 4 + 2];
      const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
      if (mn >= 180 && mx - mn <= 40) {
        const w = Math.min(1, Math.max(0, (mn - 180) / (230 - 180)));
        alphaAdjust.push([idx, Math.round(255 * (1 - w * 0.85))]);
      }
    }
  }
  for (const [idx, a] of alphaAdjust) rgba[idx * 4 + 3] = a;

  encodeRgbaPng(width, height, rgba, path.join(ROOT, job.out));
  const kb = Math.round(fs.statSync(path.join(ROOT, job.out)).size / 1024);
  const pct = Math.round((removedCount / (width * height)) * 100);
  console.log(path.basename(job.out), `${width}x${height}`, kb + 'KB', `transparent: ${pct}%`, `feathered: ${alphaAdjust.length}px`);
  // corner + center sanity
  const corner = (x, y) => rgba[(y * width + x) * 4 + 3];
  console.log('  corners alpha:', corner(0, 0), corner(width - 1, 0), corner(0, height - 1), corner(width - 1, height - 1), 'center alpha:', corner((width / 2) | 0, (height / 2) | 0));
}
