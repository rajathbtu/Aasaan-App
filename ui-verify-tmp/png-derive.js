/**
 * PNG tooling for splash handoff asset derivation + color sampling.
 * - Decodes 8-bit RGB/RGBA non-interlaced PNGs (zlib + unfilter).
 * - Finds the baked-in fake status bar of the approved splash reference and
 *   re-encodes the artwork below it as frontend/assets/splash/splash-content-exact.png
 * - Samples exact colors from both approved references.
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

/** Decode an 8-bit non-interlaced PNG into {width,height,channels,rows:Buffer[]} */
function decodePng(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
  let off = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idats = [];
  while (off < b.length) {
    const len = b.readUInt32BE(off);
    const type = b.toString('ascii', off + 4, off + 8);
    const data = b.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') idats.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8 || interlace !== 0) throw new Error(`unsupported png ${file}: depth=${bitDepth} interlace=${interlace}`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported colorType ${colorType}`);
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

function encodeRgbPng(width, height, rgb, outFile) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(outFile, png);
}

const px = (img, x, y) => {
  const i = (y * img.width + x) * img.channels;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};
const hex = ([r, g, b]) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// ---------- 1. Splash reference: find fake status bar, derive content image ----------
const splashPath = path.join(ROOT, 'Splash_Screen_Handoff/assets/splash-approved-reference.png');
const splash = decodePng(splashPath);
console.log('splash reference:', `${splash.width}x${splash.height}`, 'channels', splash.channels);

let statusBottom = 0;
for (let y = 0; y < 220; y++) {
  for (let x = 0; x < splash.width; x++) {
    if (lum(px(splash, x, y)) < 120) statusBottom = y; // dark status-bar glyphs
  }
}
const cropTop = Math.min(statusBottom + 8, 200);
console.log('fake status bar bottom row:', statusBottom, '→ crop top at', cropTop);

const outH = splash.height - cropTop;
const outRgb = Buffer.alloc(splash.width * outH * 3);
for (let y = 0; y < outH; y++) {
  for (let x = 0; x < splash.width; x++) {
    const [r, g, b] = px(splash, x, y + cropTop);
    const i = (y * splash.width + x) * 3;
    outRgb[i] = r; outRgb[i + 1] = g; outRgb[i + 2] = b;
  }
}
const outDir = path.join(ROOT, 'frontend/assets/splash');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'splash-content-exact.png');
encodeRgbPng(splash.width, outH, outRgb, outFile);
console.log('wrote', outFile, `${splash.width}x${outH}`);

// Sample artwork colors
console.log('--- splash color samples ---');
console.log('top-left bg (5,5):', hex(px(splash, 5, 5)));
console.log('bg above wordmark (418,' + (cropTop + 30) + '):', hex(px(splash, 418, cropTop + 30)));
console.log('bg mid (418,700):', hex(px(splash, 418, 700)));
console.log('bg near footer (418,1230):', hex(px(splash, 418, 1230)));
console.log('bottom waves deep (418,1470):', hex(px(splash, 418, 1470)));
// darkest saturated green in wordmark region (wordmark band approx y 430-580, x 170-660)
let wordmark = null;
for (let y = 420; y < 590; y += 2) {
  for (let x = 170; x < 660; x += 2) {
    const p = px(splash, x, y);
    if (p[1] > 120 && p[1] - p[0] > 60 && (!wordmark || lum(p) < lum(wordmark))) wordmark = p;
  }
}
console.log('wordmark green (darkest saturated):', hex(wordmark));

// ---------- 2. Name/OTP reference samples ----------
const nvPath = path.join(ROOT, 'Name_OTP_Verification_Handoff/assets/reference-approved-screen.png');
const nv = decodePng(nvPath);
console.log('\nname/otp reference:', `${nv.width}x${nv.height}`);
const S = (label, x, y) => console.log(label, `(${x},${y})`, hex(px(nv, x, y)));
S('back circle bg', 76, 116);
S('page bg', 432, 40);
S('full-name input bg', 432, 603);
S('phone row bg', 300, 768);
S('mint icon tile (person)', 79, 529);
S('secure pill bg', 432, 1379);
S('bottom wave', 432, 1520);
// CTA green: darkest saturated green in CTA band
let cta = null, ctaBright = null;
for (let y = 1170; y < 1265; y += 3) {
  for (let x = 60; x < 800; x += 4) {
    const p = px(nv, x, y);
    if (p[1] > 100 && p[1] - p[0] > 60) {
      if (!cta || lum(p) < lum(cta)) cta = p;
      if (!ctaBright || p[1] > ctaBright[1]) ctaBright = p;
    }
  }
}
console.log('CTA green dark end:', hex(cta), 'bright end:', hex(ctaBright));
// Title green ("Details"): most saturated green in title row band
let titleGreen = null;
for (let y = 325; y < 385; y += 2) {
  for (let x = 470, n = 0; x < 670; x += 2, n++) {
    const p = px(nv, x, y);
    if (p[1] - p[0] > 70 && (!titleGreen || p[1] > titleGreen[1])) titleGreen = p;
  }
}
console.log('title green ("Details"):', hex(titleGreen));
// Title ink ("Enter Your"): darkest pixel in left title band
let ink = null;
for (let y = 325; y < 385; y += 2) {
  for (let x = 200; x < 460; x += 2) {
    const p = px(nv, x, y);
    if (!ink || lum(p) < lum(ink)) ink = p;
  }
}
console.log('title ink:', hex(ink));
// OTP focused border green: saturated green near first cell border (x≈195-290, y≈940-1020)
let otpBorder = null;
for (let y = 945; y < 1015; y += 2) {
  for (let x = 195; x < 295; x += 2) {
    const p = px(nv, x, y);
    if (p[1] - p[0] > 70 && (!otpBorder || p[1] > otpBorder[1])) otpBorder = p;
  }
}
console.log('OTP focused border green:', hex(otpBorder));
// Resend link green
let resend = null;
for (let y = 1085; y < 1115; y += 2) {
  for (let x = 355; x < 510; x += 2) {
    const p = px(nv, x, y);
    if (p[1] - p[0] > 60 && (!resend || p[1] > resend[1])) resend = p;
  }
}
console.log('Resend OTP green:', hex(resend));
// Secondary text (subtitle)
let sub = null;
for (let y = 400; y < 460; y += 2) {
  for (let x = 140; x < 720; x += 2) {
    const p = px(nv, x, y);
    if (lum(p) < 150 && (!sub || lum(p) < lum(sub))) sub = p;
  }
}
console.log('subtitle text (darkest):', hex(sub));
