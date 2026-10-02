import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { deleteImageKitFile, getImageKitFileDetails, isValidProfileImageAsset } from '../utils/imagekit';

export async function listProfileImagesForReview(_req: Request, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: { picModeration: 'under_review', picAssetId: { not: null } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        picUrl: true,
        picAssetId: true,
        createdAt: true,
      },
    });
    res.json(users);
  } catch (error) {
    console.error('Failed to list profile photos for review:', error);
    res.status(500).json({ message: 'Unable to load profile photos for review.' });
  }
}

export async function approveProfileImage(req: Request, res: Response): Promise<void> {
  const userId = req.params.userId;
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, picModeration: 'under_review' },
      select: { picAssetId: true },
    });
    if (!user?.picAssetId) {
      res.status(404).json({ message: 'Profile photo not found in the review queue.' });
      return;
    }

    const file = await getImageKitFileDetails(user.picAssetId);
    if (!isValidProfileImageAsset(file, userId)) {
      res.status(400).json({ message: 'The profile photo no longer meets upload requirements.' });
      return;
    }

    const result = await prisma.user.updateMany({
      where: { id: userId, picModeration: 'under_review', picAssetId: user.picAssetId },
      data: { picModeration: 'approved', picUrl: file.url },
    });
    if (result.count === 0) {
      res.status(409).json({ message: 'The profile photo review state has changed.' });
      return;
    }
    res.json({ userId, picModeration: 'approved' });
  } catch (error) {
    console.error('Failed to approve profile photo:', error);
    res.status(502).json({ message: 'Unable to approve this profile photo.' });
  }
}

export async function blockProfileImage(req: Request, res: Response): Promise<void> {
  const userId = req.params.userId;
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, picModeration: 'under_review' },
      select: { picAssetId: true },
    });
    if (!user) {
      res.status(404).json({ message: 'Profile photo not found in the review queue.' });
      return;
    }

    const result = await prisma.user.updateMany({
      where: { id: userId, picModeration: 'under_review', picAssetId: user.picAssetId },
      data: { picModeration: 'blocked', picUrl: null, picAssetId: null },
    });
    if (result.count === 0) {
      res.status(409).json({ message: 'The profile photo review state has changed.' });
      return;
    }

    if (user.picAssetId) {
      try {
        await deleteImageKitFile(user.picAssetId);
      } catch (error) {
        console.error('Failed to delete blocked profile photo:', error);
      }
    }
    res.json({ userId, picModeration: 'blocked' });
  } catch (error) {
    console.error('Failed to block profile photo:', error);
    res.status(500).json({ message: 'Unable to block this profile photo.' });
  }
}