// Simple audio normalization utilities used by providers
export function muLawDecodeByte(muLawByte: number): number {
  const u = ~muLawByte & 0xff;
  const sign = u & 0x80;
  const exponent = (u >> 4) & 0x07;
  const mantissa = u & 0x0f;
  let sample = ((mantissa << 3) + 0x84) << exponent;
  sample = sign ? (0x84 - sample) : (sample - 0x84);
  return sample;
}

export function mulawToPcm8k(muBuf: Buffer): Buffer {
  const out = Buffer.alloc(muBuf.length * 2);
  let outIdx = 0;
  for (let i = 0; i < muBuf.length; i++) {
    const s = muLawDecodeByte(muBuf[i]);
    const v = Math.max(-32768, Math.min(32767, s));
    out.writeInt16LE(v, outIdx); outIdx += 2;
  }
  return out;
}

export function mulawToPcm24k(muBuf: Buffer): Buffer {
  const outSamples = muBuf.length * 3;
  const out = Buffer.alloc(outSamples * 2);
  let outIdx = 0;
  for (let i = 0; i < muBuf.length; i++) {
    const s = muLawDecodeByte(muBuf[i]);
    const v = Math.max(-32768, Math.min(32767, s));
    out.writeInt16LE(v, outIdx); outIdx += 2;
    out.writeInt16LE(v, outIdx); outIdx += 2;
    out.writeInt16LE(v, outIdx); outIdx += 2;
  }
  return out;
}
