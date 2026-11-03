/**
 * Cleans the My_Requests_Handoff header_clipboard crop for app use:
 * the handoff PNG is a full-canvas crop that accidentally includes the
 * prototype's notification bell (top-right) and intro text fragment
 * (bottom-left). Erases those regions (alpha 0) while preserving
 * green-dominant artwork pixels (clipboard, leaves, mint blob).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'frontend/src/assets/images/header_clipboard_transparent.png');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = 0xedb88320 ^ (c >>> 1);
      table[n] = c;
    }
  }
  let out = 0xffffffff;
  for (let i = 0; i < buf.length; i++) out = table[(out ^ buf[i]) & 0xff] ^ (out >>> 8);
  return (out ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function decodePng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || colorType !== 6) throw new Error(`Unsupported PNG: depth ${bitDepth} color ${colorType}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? cur[x - 4] : 0;
      const b = prev ? prev[x] : 0;
      const c = x >= 4 && prev ? prev[x - 4] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { width, height, data: out };
}

function encodeRgbaPng(width, height, rgba, file) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
}

const img = decodePng(FILE);
const { width, height, data } = img;

/* Green-dominant artwork pixels are preserved; everything else in the
   fragment regions is erased (white button, dark glyph, red dot, shadows,
   text). */
const isArtwork = (i) => {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  return g > r + 8 && g > b + 8;
};

const REGIONS = [
  { x0: 228, y0: 0, x1: width, y1: 118 },   // baked-in bell button (top-right)
  { x0: 0, y0: 168, x1: 50, y1: 228 },      // baked-in "ts" text (bottom-left)
];

let erased = 0;
for (const { x0, y0, x1, y1 } of REGIONS) {
  for (let y = y0; y < Math.min(y1, height); y++) {
    for (let x = x0; x < Math.min(x1, width); x++) {
      const i = y * width + x;
      if (data[i * 4 + 3] !== 0 && !isArtwork(i)) {
        data[i * 4 + 3] = 0;
        erased++;
      }
    }
  }
}

encodeRgbaPng(width, height, data, FILE);
console.log(`cleaned ${FILE}`, `${width}x${height}`, `erased: ${erased}px`);
