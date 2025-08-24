import { PrismaClient } from '@prisma/client';

const { DATABASE_URL, NODE_ENV } = process.env;
if (!DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.error('[Prisma] DATABASE_URL is not set');
}

// For Render Postgres, ensure sslmode=require on the URL. If missing, append it.
const ensureSSL = (url?: string) => {
  if (!url) return url;
  // If URL already has sslmode parameter, leave as is
  if (/sslmode=/.test(url)) return url;
  const hasQuery = url.includes('?');
  return `${url}${hasQuery ? '&' : '?'}sslmode=require`;
};

const connectionString = ensureSSL(DATABASE_URL);

const prisma = new PrismaClient({
  log: NODE_ENV === 'production' ? [] : ['error', 'warn'],
  datasourceUrl: connectionString,
});

export default prisma;
