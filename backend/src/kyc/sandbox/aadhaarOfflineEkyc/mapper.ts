import type { VerifiedIdentityData, VerifiedIdentityGender } from '../../verifiedIdentityService';
import type { VerifyOtpData } from './client';

export interface SandboxKycPayload {
  name?: string;
  gender?: string;
  dateOfBirth?: string;
  yearOfBirth?: string;
  address?: string;
}

function cleanField(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maxLength || /[\u0000-\u001F\u007F]/.test(cleaned)) {
    return undefined;
  }
  return cleaned;
}

function toProfileGender(gender: unknown): VerifiedIdentityGender | undefined {
  switch (typeof gender === 'string' ? gender.trim().toUpperCase() : '') {
    case 'M':
    case 'MALE':
      return 'male';
    case 'F':
    case 'FEMALE':
      return 'female';
    case 'T':
    case 'TRANSGENDER':
      return 'transgender';
    default:
      return undefined;
  }
}

function getBirthYear(yearOfBirth?: string, dateOfBirth?: string): number | undefined {
  const currentYear = new Date().getFullYear();
  const explicitYear = /^\d{4}$/.test(yearOfBirth || '') ? Number(yearOfBirth) : undefined;
  if (explicitYear && explicitYear >= 1940 && explicitYear <= currentYear) {
    return explicitYear;
  }

  const dateYear =
    /^(\d{4})[-/]\d{1,2}[-/]\d{1,2}$/.exec(dateOfBirth || '')?.[1] ||
    /^\d{1,2}[-/]\d{1,2}[-/](\d{4})$/.exec(dateOfBirth || '')?.[1];
  const parsedDateYear = dateYear ? Number(dateYear) : undefined;
  return parsedDateYear && parsedDateYear >= 1940 && parsedDateYear <= currentYear
    ? parsedDateYear
    : undefined;
}

/** Converts Sandbox's snake_case record into the camelCase shape returned by the API. */
export function buildKycPayload(data: VerifyOtpData): SandboxKycPayload {
  const address = data.address || {};
  const fullAddress = cleanField(data.full_address, 1000);
  const pincode =
    cleanField(address.pincode, 32) ??
    fullAddress?.match(/(?:^|\D)([1-9]\d{5})(?=\D|$)/)?.[1];
  const addressLine =
    [
      address.house,
      address.street,
      address.landmark,
      address.post_office || address.vtc,
      address.district,
      address.state,
      pincode,
    ]
      .map((part) => cleanField(part, 250))
      .filter((part): part is string => Boolean(part))
      .join(', ') || fullAddress;

  return {
    name: cleanField(data.name, 100),
    gender: cleanField(data.gender, 32),
    dateOfBirth: cleanField(data.date_of_birth, 32),
    yearOfBirth: cleanField(data.year_of_birth, 4),
    address: cleanField(addressLine, 1000),
  };
}

/** Converts the provider-shaped payload into the canonical persistence input. */
export function toVerifiedIdentityData(kyc: SandboxKycPayload): VerifiedIdentityData {
  const birthYear = getBirthYear(kyc.yearOfBirth, kyc.dateOfBirth);
  const gender = toProfileGender(kyc.gender);

  return {
    ...(kyc.name ? { name: kyc.name } : {}),
    ...(kyc.dateOfBirth ? { dateOfBirth: kyc.dateOfBirth } : {}),
    ...(birthYear ? { birthYear } : {}),
    ...(gender ? { gender } : {}),
    ...(kyc.address ? { address: kyc.address } : {}),
  };
}