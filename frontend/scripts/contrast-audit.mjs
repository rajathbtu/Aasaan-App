/**
 * WCAG contrast audit for the dark palettes in src/theme/palette.ts.
 * Run: node scripts/contrast-audit.mjs
 * Evaluates the palette module (plain data, no RN imports) and checks the
 * text/background pairs that actually occur in the UI.
 * Thresholds: >= 4.5 for normal text, >= 3.0 for large text (>=18pt or
 * bold >=14pt), >= 3.0 for UI icons/glyphs.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
let src = readFileSync(join(here, '../src/theme/palette.ts'), 'utf8');

// Strip TS-only syntax so the module can be evaluated as plain JS.
src = src
  .replace(/^import[\s\S]*?from\s+'[^']*';$/gm, '')
  .replace(/^export type.*$/gm, '')
  .replace(/: Record<[^>]*>/g, '')
  .replace(/^export const DARK_MAP_STYLE: [^=]+=/m, 'export const DARK_MAP_STYLE =')
  .replace(/: Array<[^>]*>/g, '')
  .replace(/\s+as const/g, '')
  .replace(/\s+as\s+(BasePalette|ConsumerPalette|ProfilePalette)/g, '')
  .replace(/^export const /gm, 'const ');

const palette = new Function(`${src}; return { baseDark, consumerDark, profileDark };`)();

const luminance = (hex) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (fg, bg) => {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
};

// [family, fgToken, bgToken, threshold, label]
const pairs = [
  ['base', 'dark', 'background', 4.5, 'primary text on page bg'],
  ['base', 'dark', 'white', 4.5, 'primary text on card'],
  ['base', 'dark', 'canvas', 4.5, 'primary text on canvas'],
  ['base', 'grey', 'white', 4.5, 'secondary text on card'],
  ['base', 'grey', 'background', 4.5, 'secondary text on page'],
  ['base', 'greyMuted', 'white', 3.0, 'placeholder/hint on card (large/aux)'],
  ['base', 'brandDark', 'white', 4.5, 'green accent text on card'],
  ['base', 'brandDark', 'primarySoft', 4.5, 'green accent text on mint tile'],
  ['base', 'brandDark', 'greenSoft', 4.5, 'green accent text on greenSoft'],
  ['base', 'onPrimary', 'primary', 3.0, 'white on primary button'],
  ['base', 'onPrimary', 'brand', 3.0, 'white on brand button'],
  ['base', 'dangerText', 'white', 4.5, 'danger text on card'],
  ['base', 'dangerText', 'dangerSoft', 4.5, 'danger text on danger pill'],
  ['base', 'selectionHeadingText', 'greenSoft', 4.5, 'section heading on greenSoft'],
  ['base', 'labelGreen', 'labelBg', 4.5, 'label green on labelBg'],
  ['base', 'currentLocText', 'currentLocBg', 4.5, 'current-location text'],
  ['base', 'chipText', 'primarySoft', 4.5, 'chip text on mint chip'],
  ['base', 'termsText', 'white', 4.5, 'terms text on card'],
  ['base', 'radiusBtnText', 'white', 4.5, 'radius button text on card'],
  ['base', 'error', 'white', 4.5, 'error text on card'],
  ['base', 'warning', 'white', 3.0, 'warning text on card (large)'],
  ['base', 'violet', 'white', 3.0, 'violet accent on card'],

  ['consumer', 'ink', 'page', 4.5, 'ink on page'],
  ['consumer', 'ink', 'white', 4.5, 'ink on card'],
  ['consumer', 'muted', 'white', 4.5, 'muted on card'],
  ['consumer', 'muted', 'page', 4.5, 'muted on page'],
  ['consumer', 'primaryDark', 'white', 4.5, 'green accent text on card'],
  ['consumer', 'primaryDark', 'mint', 4.5, 'green accent text on mint'],
  ['consumer', 'primaryDark', 'selectedMint', 4.5, 'green accent text on selectedMint'],
  ['consumer', 'statusText', 'statusBg', 4.5, 'status pill text'],
  ['consumer', 'boostText', 'boostBg', 4.5, 'boost tile text'],
  ['consumer', 'closeText', 'closeBg', 4.5, 'close tile text'],
  ['consumer', 'respGreenText', 'respGreenBg', 4.5, 'response strip green'],
  ['consumer', 'respBlueText', 'respBlueBg', 4.5, 'response strip blue'],
  ['consumer', 'respPurpleText', 'respPurpleBg', 4.5, 'response strip purple'],
  ['consumer', 'filterText', 'white', 4.5, 'filter chip text'],
  ['consumer', 'metaInk', 'white', 4.5, 'meta ink on card'],
  ['consumer', 'cardTitle', 'white', 4.5, 'card title'],
  ['consumer', 'cardCategory', 'white', 4.5, 'card category'],
  ['consumer', 'cardMeta', 'white', 4.5, 'card meta'],
  ['consumer', 'acceptedText', 'acceptedBg', 4.5, 'accepted pill text'],
  ['consumer', 'pointsPillText', 'pointsPillBg', 4.5, 'points pill text'],
  ['consumer', 'profileText', 'profileBg', 4.5, 'profile panel text'],
  ['consumer', 'onPrimary', 'ctaStart', 3.0, 'white on CTA gradient start'],
  ['consumer', 'onPrimary', 'tabActiveStart', 3.0, 'white on tab active gradient'],

  ['profile', 'ink', 'page', 4.5, 'ink on page'],
  ['profile', 'ink', 'white', 4.5, 'ink on card'],
  ['profile', 'muted', 'white', 4.5, 'muted on card'],
  ['profile', 'muted', 'page', 4.5, 'muted on page'],
  ['profile', 'desc', 'white', 4.5, 'notification desc on card'],
  ['profile', 'primaryDark', 'white', 4.5, 'green accent text on card'],
  ['profile', 'primaryDark', 'primarySoft', 4.5, 'green accent text on mint tile'],
  ['profile', 'primaryDark', 'rowIconBg', 4.5, 'green icon on row icon tile'],
  ['profile', 'markText', 'markBg', 4.5, 'mark-all text on mark pill'],
  ['profile', 'purpleInk', 'purpleSoft', 4.5, 'pro plan heading on violet card'],
  ['profile', 'purplePrice', 'purpleSoft', 4.5, 'pro price ink on violet card'],
  ['profile', 'purpleMuted', 'purpleSoft', 4.5, 'pro subtitle on violet card'],
  ['profile', 'dangerText', 'dangerSoft', 4.5, 'danger pill text'],
  ['profile', 'dangerInk', 'dangerSoft', 4.5, 'danger pill ink'],
  ['profile', 'version', 'white', 3.0, 'version caption (small aux text)'],
  ['profile', 'chipGreen', 'primarySoft', 4.5, 'service chip text'],
];

let failed = 0;
for (const [family, fg, bg, min, label] of pairs) {
  const p = palette[`${family}Dark`];
  if (!p || !p[fg] || !p[bg]) {
    console.log(`MISSING  ${family}.${fg} / ${family}.${bg} — ${label}`);
    failed++;
    continue;
  }
  const r = ratio(p[fg], p[bg]);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)}  (min ${min})  ${family}.${fg} on ${family}.${bg} — ${label}`);
}
console.log(failed === 0 ? '\nAll contrast checks passed.' : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
