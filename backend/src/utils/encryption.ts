import crypto from 'crypto';

export interface OnboardingTokenData {
  phone: string;
  otp: string;
  name?: string;
  language?: string;
}

const getEncryptionKey = (): Buffer => {
  const secret = process.env.ONBOARDING_TOKEN_SECRET;
  if (!secret) throw new Error('ONBOARDING_TOKEN_SECRET is not configured');
  return crypto.createHash('sha256').update(secret).digest();
};

export function encryptOnboardingToken(data: OnboardingTokenData): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((value) => value.toString('base64url')).join('.');
}

export function decryptOnboardingToken(token: string): OnboardingTokenData {
  const [ivEncoded, tagEncoded, encryptedEncoded] = token.split('.');
  if (!ivEncoded || !tagEncoded || !encryptedEncoded) throw new Error('Invalid onboarding token');

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivEncoded, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
    decipher.final(),
  ]);
  const data = JSON.parse(decrypted.toString('utf8')) as OnboardingTokenData;
  if (!data.phone || !data.otp) throw new Error('Invalid onboarding token data');
  return data;
}