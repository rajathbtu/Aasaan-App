import * as ImagePicker from 'expo-image-picker';
import { getProfileImageUploadAuthorization, submitProfileImage } from '../api';

interface UploadAuthorization {
  token: string;
  maxBytes: number;
  uploadPayload: Record<string, string>;
}

interface ImageKitUploadResult {
  fileId?: string;
  message?: string;
  help?: string;
}

export async function uploadProfileImage(token: string, asset: ImagePicker.ImagePickerAsset): Promise<void> {
  const authorization = await getProfileImageUploadAuthorization(token) as UploadAuthorization;
  if (asset.fileSize !== undefined && asset.fileSize > authorization.maxBytes) {
    const maxMegabytes = (authorization.maxBytes / (1024 * 1024)).toFixed(1);
    throw new Error(`Choose an image smaller than ${maxMegabytes} MB.`);
  }

  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    name: authorization.uploadPayload.fileName,
    type: asset.mimeType || 'image/jpeg',
  } as any);
  Object.entries(authorization.uploadPayload).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append('token', authorization.token);

  const response = await fetch('https://upload.imagekit.io/api/v2/files/upload', {
    method: 'POST',
    body: formData,
  });
  const result = await response.json().catch(() => ({})) as ImageKitUploadResult;
  if (!response.ok || !result.fileId) {
    throw new Error(result.message || result.help || 'Image upload failed. Please try again.');
  }

  await submitProfileImage(token, result.fileId);
}
