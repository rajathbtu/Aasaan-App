import prisma from '../utils/prisma';
import { encryptKycData } from '../utils/kycEncryption';

export type VerifiedIdentityGender = 'male' | 'female' | 'transgender';

export interface VerifiedIdentityData {
  name?: string;
  dateOfBirth?: string;
  birthYear?: number;
  gender?: VerifiedIdentityGender;
  address?: string;
}

function assertCleanField(value: unknown, maxLength: number, fieldName: string): void {
  if ( value !== undefined && ( typeof value !== 'string' ||
      !value || value !== value.trim() || value.length > maxLength || 
      /[\u0000-\u001F\u007F]/.test(value))) {
    throw new Error(`Invalid verified identity ${fieldName}`);
  }
}

function isValidBirthYear(year: number | undefined): boolean {
  return year !== undefined && Number.isInteger(year) && year >= 1940 && year <= new Date().getFullYear();
}

function getDOBYear(value: string): number | undefined {
  const yearFirst = /^(\d{4})([-/])\d{1,2}\2\d{1,2}$/.exec(value);
  const dayFirst = /^\d{1,2}([-/])\d{1,2}\1(\d{4})$/.exec(value);
  const year = yearFirst?.[1] ?? dayFirst?.[2];
  return year ? Number(year) : undefined;
}

function validateIdentity(identity: VerifiedIdentityData): void {
  if (!identity || typeof identity !== 'object') 
    throw new Error('Invalid verified identity');
  
  assertCleanField(identity.name, 100, 'name');
  assertCleanField(identity.dateOfBirth, 32, 'date of birth');
  assertCleanField(identity.address, 1000, 'address');
  
  if (identity.dateOfBirth !== undefined && !isValidBirthYear(getDOBYear(identity.dateOfBirth))) {
      throw new Error('Invalid verified identity DOB birth year');
  }

  if (!isValidBirthYear(identity.birthYear))
    throw new Error('Invalid verified identity birth year');

  if (identity.gender !== undefined && !['male', 'female', 'transgender'].includes(identity.gender)) 
    throw new Error('Invalid verified identity gender');
}

export async function saveVerifiedIdentity( userId: string, aadhaarLast4: string, identity: VerifiedIdentityData,
): Promise<void> {
  if (!/^\d{4}$/.test(aadhaarLast4)) throw new Error('Invalid Aadhaar suffix');
  validateIdentity(identity);

  const { name, dateOfBirth, birthYear, gender, address } = identity;
  const encryptedData = encryptKycData({
    ...(name ? { name } : {}),
    ...(dateOfBirth ? { dateOfBirth } : {}),
    ...(gender ? { gender } : {}),
    ...(address ? { address } : {}),
  });

  await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) throw new Error('User not found');

    await transaction.user.update({
      where: { id: userId },
      data: {
        ...(name ? { name } : {}),
        aadhaarKycData: encryptedData,
        aadhaarVerified: true,
        aadhaarLast4,
      },
    });

    if (user.role === 'serviceProvider' && (birthYear || gender)) {
      await transaction.serviceProviderInfo.upsert({
        where: { userId },
        create: {
          services: [],
          radius: 20,
          birthYear: birthYear ?? null,
          gender: gender ?? null,
          user: { connect: { id: userId } },
        },
        update: {
          ...(birthYear ? { birthYear } : {}),
          ...(gender ? { gender } : {}),
        },
      });
    }
  });
}
