import { User, Role } from './User';
import { WorkRequest } from './WorkRequest';
import { Notification } from './Notification';
import prisma from '../utils/prisma';

const pAny: any = prisma;

/*
 * Simple in‑memory data store.  In a real deployment the following
 * collections would be replaced with calls to a database.  All data
 * persists only for the lifetime of the running process.
 */


/**
 * Find a user by their phone number.  Returns undefined if the user does
 * not exist.
 */
export async function findUserByPhone(phoneNumber: string) {
  return prisma.user.findUnique({ where: { phoneNumber } });
}

/**
 * Find a user by id.
 */
export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

/**
 * Create a new user.  Generates a UUID and stores the user in the database.
 */
export async function createUser(params: Omit<User, 'id' | 'createdAt'>) {
  const { serviceProviderInfo, ...userData } = params;
  return prisma.user.create({
    data: {
      ...userData,
      serviceProviderInfo: serviceProviderInfo
        ? {
            create: {
              services: serviceProviderInfo.services,
              radius: serviceProviderInfo.radius,
              location: serviceProviderInfo.location
                ? {
                    create: {
                      name: serviceProviderInfo.location.name,
                      lat: serviceProviderInfo.location.lat,
                      lng: serviceProviderInfo.location.lng,
                    },
                  }
                : undefined,
            },
          }
        : undefined,
    },
  });
}

/**
 * Create a new work request.  Applies a simple 7‑day expiry and default values.
 */
export async function createWorkRequest(
  params: Omit<WorkRequest, 'id' | 'createdAt' | 'status' | 'boosted' | 'acceptedProviders'>
) {
  const { location, rating: _ignoreRating, ...rest } = params;

  // Create Location first and use its id (matches pattern used elsewhere and avoids type mismatches)
  const createdLocation = await pAny.location.create({
    data: { name: location.name, lat: location.lat, lng: location.lng },
  });

  // Create WorkRequest without `rating` on creation
  const wr = await pAny.workRequest.create({
    data: {
      userId: rest.userId,
      service: rest.service,
      locationId: createdLocation.id,
      tags: rest.tags || [],
      createdAt: new Date(),
      status: 'active',
      boosted: false,
      ...(rest.closedAt ? { closedAt: rest.closedAt } : {}),
    },
  });

  return wr as any;
}

/**
 * Push a notification for a user.
 */
export async function pushNotification(
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
) {
  return prisma.notification.create({
    data: {
      ...notification,
      createdAt: new Date(),
      read: false,
    },
  });
}

/**
 * Generate and return a numeric OTP.  In production you would send this
 * code via SMS using a third‑party provider.  Here we simply return it
 * directly.
 */
export function generateOTP(): number {
  return Math.floor(1000 + Math.random() * 9000);
}