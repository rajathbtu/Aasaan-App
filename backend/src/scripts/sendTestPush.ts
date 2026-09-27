/**
 * CLI helper to test Expo push notification delivery without running the server.
 *
 * Usage:
 *   npm run push:send-test -- <userId>
 *   npm run push:send-test -- <phoneNumber>
 *   npm run push:send-test
 *   (with no argument, picks the user whose push token was updated most recently)
 *
 * Useful to verify that Expo has valid FCM v1 credentials for the app after
 * uploading the Firebase service account private key (see backend/Firebase-service-account-credentials.json).
 *
 * Reads credentials from backend/.env, just like the server does.
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import prisma from '../utils/prisma';
import { sendPushToUser } from '../utils/pushNotifications';

const userSelect = {
  id: true,
  name: true,
  phoneNumber: true,
  pushToken: true,
  pushTokenPlatform: true,
  pushTokenUpdatedAt: true,
} as const;

async function resolveRecipient(identifier?: string) {
  if (identifier) {
    return prisma.user.findFirst({
      where: { OR: [{ id: identifier }, { phoneNumber: identifier }] },
      select: userSelect,
    });
  }
  return prisma.user.findFirst({
    where: { pushToken: { not: null } },
    orderBy: [{ pushTokenUpdatedAt: 'desc' }, { createdAt: 'desc' }],
    select: userSelect,
  });
}

async function main(): Promise<void> {
  const [identifier] = process.argv.slice(2);
  const user = await resolveRecipient(identifier);

  if (!user) {
    console.error(identifier ? `No user found for '${identifier}'.` : 'No user with a stored push token found.');
    process.exit(1);
  }
  if (!user.pushToken) {
    console.error(`User ${user.name} (${user.phoneNumber}) has no push token stored.`);
    process.exit(1);
  }

  const tokenPreview = `${user.pushToken.slice(0, 24)}...`;
  console.log('Sending test push:');
  console.log(`  user:     ${user.name} (${user.phoneNumber})`);
  console.log(`  platform: ${user.pushTokenPlatform ?? 'unknown'}`);
  console.log(`  token:    ${tokenPreview}`);

  const sent = await sendPushToUser(user.id, {
    title: 'Aasaan test notification',
    body: 'If you can read this, Expo push delivery is working again.',
    data: { type: 'test' },
  });

  if (sent) {
    console.log('Push ticket accepted by Expo! Check the device for the notification.');
    console.log('  (If it does not arrive on Android, verify the FCM v1 credentials on https://expo.dev/notifications)');
  } else {
    console.error('Expo rejected the push (see the error details above).');
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('Failed to send test push:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
