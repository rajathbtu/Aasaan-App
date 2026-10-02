import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import {
  createImageKitUploadAuthorization,
  deleteImageKitFile,
  getImageKitFileDetails,
  isProfileImageOwnedBy,
  isValidProfileImageAsset,
} from '../utils/imagekit';

function getAuthenticatedUserId(req: Request): string {
  return (req as any).user.id as string;
}

export function getProfileImageUploadAuthorization(req: Request, res: Response): void {
  try {
    res.json(createImageKitUploadAuthorization(getAuthenticatedUserId(req)));
  } catch (error) {
    console.error('Failed to create ImageKit upload authorization:', error);
    res.status(503).json({ message: 'Profile photo uploads are unavailable.' });
  }
}

export async function submitProfileImage(req: Request, res: Response): Promise<void> {
  const userId = getAuthenticatedUserId(req);
  const fileId = typeof req.body?.fileId === 'string' ? req.body.fileId.trim() : '';
  if (!fileId) {
    res.status(400).json({ message: 'An ImageKit fileId is required.' });
    return;
  }

  let uploadedFileId: string | null = null;
  try {
    const file = await getImageKitFileDetails(fileId);
    uploadedFileId = file.fileId;
    if (!isValidProfileImageAsset(file, userId)) {
      if (isProfileImageOwnedBy(file, userId)) {
        await deleteImageKitFile(file.fileId).catch((cleanupError) => {
          console.error('Failed to delete invalid profile image:', cleanupError);
        });
      }
      res.status(400).json({ message: 'The uploaded image does not meet profile photo requirements.' });
      return;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { picAssetId: true },
    });
    if (!currentUser) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        picUrl: file.url,
        picAssetId: file.fileId,
        picModeration: 'under_review',
      },
      select: { id: true, picModeration: true },
    });
    uploadedFileId = null;

    if (currentUser.picAssetId && currentUser.picAssetId !== file.fileId) {
      try {
        await deleteImageKitFile(currentUser.picAssetId);
      } catch (cleanupError) {
        console.error('Failed to delete superseded profile image:', cleanupError);
      }
    }

    res.json({ id: updated.id, picModeration: updated.picModeration, message: 'Profile photo submitted for review.' });
  } catch (error) {
    if (uploadedFileId) {
      await deleteImageKitFile(uploadedFileId).catch((cleanupError) => {
        console.error('Failed to clean up unsubmitted profile image:', cleanupError);
      });
    }
    console.error('Failed to submit profile image:', error);
    res.status(502).json({ message: 'The uploaded image could not be verified.' });
  }
}