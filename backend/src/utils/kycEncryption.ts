import crypto from 'crypto';

const KEY_ENV_NAME = 'AADHAAR_KYC_ENCRYPTION_KEY';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;

export class KycEncryptionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KycEncryptionConfigurationError';
  }
}

function getEncryptionKey(): Buffer {
  const encodedKey = process.env[KEY_ENV_NAME];
  if (!encodedKey) throw new KycEncryptionConfigurationError(
      `${KEY_ENV_NAME} is not configured. Set it to a base64-encoded, random 32-byte key.`);  

  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== KEY_LENGTH || key.toString('base64') !== encodedKey) {
    throw new KycEncryptionConfigurationError(`${KEY_ENV_NAME} must be a base64-encoded 32-byte key`);
  }

  return key;
}

export function assertKycEncryptionConfigured(): void {
  getEncryptionKey();
}

export function encryptKycData(data: unknown): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv, tag, encrypted].map((value) =>
    typeof value === 'string' ? value : value.toString('base64url'),
  ).join('.');
}

export function decryptKycData<T>(value: string): T {
  const [version, ivEncoded, tagEncoded, encryptedEncoded] = value.split('.');
  if (version !== 'v1' || !ivEncoded || !tagEncoded || !encryptedEncoded) {
    throw new Error('Invalid encrypted KYC data');
  }

  const iv = Buffer.from(ivEncoded, 'base64url');
  const tag = Buffer.from(tagEncoded, 'base64url');
  if (iv.length !== IV_LENGTH || tag.length !== 16) {
    throw new Error('Invalid encrypted KYC data');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8')) as T;
}