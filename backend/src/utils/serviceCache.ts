export interface CachedService {
  id: string;
  name: string;
  category: string;
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

export function invalidateServiceCache(): void {
  cachedServices = null;
  cacheExpiresAt = 0;
}