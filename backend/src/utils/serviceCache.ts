import prisma from './prisma';
import { syncServices } from './serviceSeeder';

export interface CachedService {
  id: string;
  name: string;
  category: string;
  alias: string[];
  tags: string[];
  icon: string;
  color: string;
}

const SERVICE_CACHE_TTL_MS = 30 * 60 * 1000;

let cachedServices: CachedService[] | null = null;
let cacheExpiresAt = 0;
let loadingServices: Promise<CachedService[]> | null = null;

export async function getCachedServices(
  loadServices: () => Promise<CachedService[]>,
): Promise<CachedService[]> {
  if (cachedServices && Date.now() < cacheExpiresAt) return cachedServices;
  if (loadingServices) return loadingServices;

  loadingServices = loadServices()
    .then((services) => {
      cachedServices = services;
      cacheExpiresAt = Date.now() + SERVICE_CACHE_TTL_MS;
      return services;
    })
    .finally(() => {
      loadingServices = null;
    });

  return loadingServices;
}

/** Loads the canonical service catalog through the shared cache. */
export async function getServices(): Promise<CachedService[]> {
  const pAny = prisma as any;

  return getCachedServices(async () => {
    await syncServices();
    return pAny.service.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }) as Promise<CachedService[]>;
  });
}

export function invalidateServiceCache(): void {
  cachedServices = null;
  cacheExpiresAt = 0;
}