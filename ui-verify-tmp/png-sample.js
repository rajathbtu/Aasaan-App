/**
 * Precise color sampling from the two approved references (both 941x1672).
 * Also re-verifies the status-bar cut of the derived splash content image.
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

const px = (img, x, y) => {
  const i = (y * img.width + x) * img.channels;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};
const hex = ([r, g, b]) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const S = (img, label, x, y) => console.log(label.padEnd(34), `(${x},${y})`, hex(px(img, x, y)));

// ---------- Splash reference ----------
const splash = decodePng(path.join(ROOT, 'Splash_Screen_Handoff/assets/splash-approved-reference.png'));
console.log('splash:', `${splash.width}x${splash.height}`);
console.log('--- status bar row scan (min luminance per row, rows 0..130) ---');
const rowMin = [];
for (let y = 0; y <= 130; y++) {
  let m = 255;
  for (let x = 0; x < splash.width; x++) { const l = lum(px(splash, x, y)); if (l < m) m = l; }
  rowMin.push(m);
}
// print only rows where min lum < 180 (content) compactly
let runs = [];
let start = null;
for (let y = 0; y <= 130; y++) {
  if (rowMin[y] < 180 && start === null) start = y;
  if (rowMin[y] >= 180 && start !== null) { runs.push([start, y - 1]); start = null; }
}
if (start !== null) runs.push([start, 130]);
console.log('dark-content row runs:', JSON.stringify(runs));
console.log('--- splash color samples ---');
S(splash, 'top-left bg', 5, 5);
S(splash, 'bg y=100 (below status)', 470, 100);
S(splash, 'bg y=300', 470, 300);
S(splash, 'wordmark green', 300, 570);
S(splash, 'tagline slate', 300, 700);
S(splash, 'underline mint', 470, 762);
S(splash, 'pale hill', 200, 900);
S(splash, 'footer area bg', 470, 1350);
S(splash, 'wave mid', 470, 1560);
S(splash, 'wave deep', 470, 1660);
// darkest saturated green in wordmark band y 470..660
let wm = null;
for (let y = 470; y < 660; y += 2) for (let x = 170; x < 760; x += 2) {
  const p = px(splash, x, y);
  if (p[1] > 120 && p[1] - p[0] > 60 && (!wm || lum(p) < lum(wm))) wm = p;
}
console.log('wordmark darkest saturated green:', hex(wm));
// derived content image top row average color
const derived = decodePng(path.join(ROOT, 'frontend/assets/splash/splash-content-exact.png'));
console.log('derived:', `${derived.width}x${derived.height}`);
let avg = [0, 0, 0];
for (let x = 0; x < derived.width; x++) { const p = px(derived, x, 0); avg[0] += p[0]; avg[1] += p[1]; avg[2] += p[2]; }
avg = avg.map(v => Math.round(v / derived.width));
console.log('derived row0 avg color:', hex(avg));
let row0min = 255, row0max = 0;
for (let x = 0; x < derived.width; x++) { const l = lum(px(derived, x, 0)); row0min = Math.min(row0min, l); row0max = Math.max(row0max, l); }
console.log('derived row0 luminance min/max:', row0min.toFixed(1), row0max.toFixed(1));

// ---------- Name/OTP reference ----------
const nv = decodePng(path.join(ROOT, 'Name_OTP_Verification_Handoff/assets/reference-approved-screen.png'));
console.log('\nname/otp:', `${nv.width}x${nv.height}`);
S(nv, 'page bg', 470, 44);
S(nv, 'back circle bg', 83, 126);
S(nv, 'full-name input bg', 470, 657);
S(nv, 'phone row bg', 327, 836);
S(nv, 'mint icon tile', 86, 576);
S(nv, 'secure pill bg', 470, 1502);
S(nv, 'bottom wave', 470, 1655);
S(nv, 'input border (top edge)', 470, 609);
// CTA band scan
let ctaDark = null, ctaBright = null;
for (let y = 1274; y < 1377; y += 3) for (let x = 65; x < 875; x += 4) {
  const p = px(nv, x, y);
  if (p[1] > 100 && p[1] - p[0] > 60) {
    if (!ctaDark || lum(p) < lum(ctaDark)) ctaDark = p;
    if (!ctaBright || lum(p) > lum(ctaBright)) ctaBright = p;
  }
}
console.log('CTA dark end:', hex(ctaDark), ' CTA bright end:', hex(ctaBright));
let titleGreen = null;
for (let y = 354; y < 419; y += 2) for (let x = 512; x < 730; x += 2) {
  const p = px(nv, x, y);
  if (p[1] - p[0] > 70 && p[1] > 100 && (!titleGreen || p[1] > titleGreen[1])) titleGreen = p;
}
console.log('title "Details" green (brightest saturated):', hex(titleGreen));
let ink = null;
for (let y = 354; y < 419; y += 2) for (let x = 218; x < 501; x += 2) {
  const p = px(nv, x, y);
  if (!ink || lum(p) < lum(ink)) ink = p;
}
console.log('title ink (darkest):', hex(ink));
let otpBorder = null;
for (let y = 1029; y < 1105; y += 2) for (let x = 212; x < 321; x += 2) {
  const p = px(nv, x, y);
  if (p[1] - p[0] > 70 && p[1] > 100 && (!otpBorder || p[1] > otpBorder[1])) otpBorder = p;
}
console.log('OTP focused border green:', hex(otpBorder));
let resend = null;
for (let y = 1181; y < 1214; y += 2) for (let x = 387; x < 555; x += 2) {
  const p = px(nv, x, y);
  if (p[1] - p[0] > 60 && p[1] > 100 && (!resend || p[1] > resend[1])) resend = p;
}
console.log('Resend OTP green:', hex(resend));
let sub = null;
for (let y = 436; y < 501; y += 2) for (let x = 152; x < 784; x += 2) {
  const p = px(nv, x, y);
  if (lum(p) < 160 && (!sub || lum(p) < lum(sub))) sub = p;
}
console.log('subtitle text (darkest):', hex(sub));
// change link green
let change = null;
for (let y = 815; y < 860; y += 2) for (let x = 680; x < 870; x += 2) {
  const p = px(nv, x, y);
  if (p[1] - p[0] > 60 && p[1] > 100 && (!change || p[1] > change[1])) change = p;
}
console.log('Change link green:', hex(change));
