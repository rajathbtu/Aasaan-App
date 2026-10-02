import { createHmac, randomUUID } from 'crypto';

const IMAGEKIT_API_URL = 'https://api.imagekit.io/v1';
const PROFILE_IMAGE_FOLDER = 'profile-pictures';
const PROFILE_IMAGE_MAX_BYTES_DEFAULT = 20 * 1024 * 1024;
const PROFILE_IMAGE_TRANSFORMATION = JSON.stringify({
  pre: 'w-100,h-100,c-maintain_ratio,q-80',
});

interface ImageKitConfig {
  privateKey: string;
  publicKey: string;
  urlEndpoint: string;
  maxBytes: number;
}

export interface ImageKitUploadAuthorization {
  token: string;
  maxBytes: number;
  uploadPayload: {
    fileName: string;
    folder: string;
    useUniqueFileName: string;
    transformation: string;
    checks: string;
  };
}

export interface ImageKitFileDetails {
  fileId: string;
  filePath: string;
  fileType: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  url: string;
}

function readImageKitConfig(): ImageKitConfig {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim();
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY?.trim();
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim();
  if (!privateKey || !publicKey || !urlEndpoint) {
    throw new Error('ImageKit is not configured. Set IMAGEKIT_PRIVATE_KEY, IMAGEKIT_PUBLIC_KEY, and IMAGEKIT_URL_ENDPOINT.');
  }
  let parsedUrlEndpoint: URL;
  try {
    parsedUrlEndpoint = new URL(urlEndpoint);
  } catch {
    throw new Error('IMAGEKIT_URL_ENDPOINT must be a valid HTTPS URL.');
  }
  if (parsedUrlEndpoint.protocol !== 'https:') {
    throw new Error('IMAGEKIT_URL_ENDPOINT must be a valid HTTPS URL.');
  }

  const configuredMaxBytes = process.env.PROFILE_IMAGE_MAX_BYTES?.trim();
  const maxBytes = configuredMaxBytes ? Number(configuredMaxBytes) : PROFILE_IMAGE_MAX_BYTES_DEFAULT;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error('PROFILE_IMAGE_MAX_BYTES must be a positive integer.');
  }

  return {
    privateKey,
    publicKey,
    urlEndpoint: urlEndpoint.replace(/\/$/, ''),
    maxBytes,
  };
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function createUploadToken(payload: Record<string, string | number>, publicKey: string, privateKey: string): string {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: publicKey }));
  const body = encodeBase64Url(JSON.stringify(payload));
  const signature = createHmac('sha256', privateKey).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function createImageKitUploadAuthorization(userId: string): ImageKitUploadAuthorization {
  const config = readImageKitConfig();
  const fileName = `profile-${userId}-${randomUUID()}.jpg`;
  const uploadPayload = {
    fileName,
    folder: PROFILE_IMAGE_FOLDER,
    useUniqueFileName: 'false',
    transformation: PROFILE_IMAGE_TRANSFORMATION,
    checks: `'file.size' <= '${config.maxBytes}' AND 'file.mime' IN ['image/jpeg', 'image/png', 'image/webp']`,
  };
  const issuedAt = Math.floor(Date.now() / 1000);
  const token = createUploadToken(
    { ...uploadPayload, iat: issuedAt, exp: issuedAt + 300 },
    config.publicKey,
    config.privateKey,
  );

  return { token, maxBytes: config.maxBytes, uploadPayload };
}

async function imageKitApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { privateKey } = readImageKitConfig();
  const authorization = Buffer.from(`${privateKey}:`).toString('base64');
  const response = await fetch(`${IMAGEKIT_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${authorization}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`ImageKit API returned ${response.status}: ${message}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getImageKitFileDetails(fileId: string): Promise<ImageKitFileDetails> {
  return imageKitApiRequest<ImageKitFileDetails>(`/files/${encodeURIComponent(fileId)}/details`);
}

export async function deleteImageKitFile(fileId: string): Promise<void> {
  await imageKitApiRequest<void>(`/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
}

export function isProfileImageOwnedBy(file: ImageKitFileDetails, userId: string): boolean {
  return file.filePath.startsWith(`/${PROFILE_IMAGE_FOLDER}/profile-${userId}-`);
}

export function isValidProfileImageAsset(file: ImageKitFileDetails, userId: string): boolean {
  const config = readImageKitConfig();
  let actualOrigin: string;
  let expectedOrigin: string;
  try {
    actualOrigin = new URL(file.url).origin;
    expectedOrigin = new URL(config.urlEndpoint).origin;
  } catch {
    return false;
  }

  return file.fileType === 'image'
    && ['image/jpeg', 'image/png', 'image/webp'].includes(file.mime)
    && isProfileImageOwnedBy(file, userId)
    && file.size <= config.maxBytes
    && file.width === 100
    && file.height === 100
    && actualOrigin === expectedOrigin;
}