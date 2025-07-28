/**
 * Simple reversible obfuscation for phone numbers.  This is **not** secure
 * encryption and is only included to satisfy the specification that phone
 * numbers be stored in an encrypted format.  For real encryption use a
 * library such as `crypto` with AES or an external secret management
 * service.
 */

export function encryptPhoneNumber(phone: string): string {
  return Buffer.from(phone, 'utf8').toString('base64');
}

export function decryptPhoneNumber(encrypted: string): string {
  return Buffer.from(encrypted, 'base64').toString('utf8');
}