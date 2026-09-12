/**
 * CLI helper to test the WhatsApp integration without running the server.
 *
 * Usage:
 *   npm run whatsapp:send-test -- +919876543210
 *   npm run whatsapp:send-test -- +919876543210 hello_world en_US
 *
 * Reads credentials from backend/.env, just like the server does.
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { initiateConversation } from './service';

async function main(): Promise<void> {
  const [phone, templateName, languageCode] = process.argv.slice(2);
  if (!phone) {
    console.error('Usage: npm run whatsapp:send-test -- <phone> [templateName] [languageCode]');
    process.exit(1);
  }

  try {
    const result = await initiateConversation({
      to: phone,
      templateName: templateName || undefined,
      languageCode: languageCode || undefined,
    });
    console.log('WhatsApp message sent successfully!');
    console.log(`  to:        ${result.waId}`);
    console.log(`  messageId: ${result.messageId}`);
    console.log('  (If it does not arrive, check that this number is added as a test recipient — see README.md)');
  } catch (error) {
    console.error('Failed to send WhatsApp message:');
    console.error(error instanceof Error ? (error as any).details ?? error.message : error);
    process.exit(1);
  }
}

main();
