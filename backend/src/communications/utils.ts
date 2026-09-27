/** Phone formats shared by communication providers and account lookup. */
export function normalizePhoneNumber(raw: string): string {
  const digits = String(raw).replace(/\D+/g, '');
  if (digits.length < 8 || digits.length > 15) {
    throw new Error(`Invalid phone number: "${raw}". Provide it in international format, e.g. +919876543210.`);
  }
  return digits;
}

/** Converts an Indian WhatsApp number to the ten-digit database format. */
export function toStoredPhoneNumber(phone: string): string {
  return phone.startsWith('91') && phone.length === 12 ? phone.slice(2) : phone;
}