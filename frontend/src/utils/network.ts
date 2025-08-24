import { NativeModules } from 'react-native';
import Constants from 'expo-constants';

// Extract hostname from various URL-like or host:port strings
export const extractHost = (value?: string): string | undefined => {
  if (!value) return undefined;
  const str = String(value);
  const normalized = str.includes('//') ? str : `//${str}`; // allow "host:port" or full URL
  const match = normalized.match(/\/\/([^:\/]+)(?::\d+)?/);
  const host = match?.[1];
  if (!host) return undefined;
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return undefined;
  return host;
};

// Attempt to detect the Metro/dev server host (your Mac's LAN IP) at runtime
export const getDevHost = (): string | undefined => {
  try {
    const hostUri = (Constants as any)?.expoGoConfig?.hostUri
      ?? (Constants as any)?.manifest?.debuggerHost
      ?? (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;
    const fromExpo = extractHost(hostUri);
    if (fromExpo) return fromExpo;

    const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
    const fromScript = extractHost(scriptURL);
    if (fromScript) return fromScript;
  } catch {}
  return undefined;
};

export const getEnvBaseUrl = (envVarName = 'EXPO_PUBLIC_API_BASE_URL'): string | undefined => {
  // Expo exposes env vars prefixed with EXPO_PUBLIC_
  const value = (process.env as Record<string, string | undefined>)[envVarName];
  return value;
};

// Resolve the base URL for development
export const resolveDevBaseUrl = (
  port: number,
  fallback?: string,
  envVarName = 'EXPO_PUBLIC_API_BASE_URL'
): string => {
  const env = getEnvBaseUrl(envVarName);
  if (env) return env;
  const host = getDevHost();
  if (host) return `http://${host}:${port}`;
  return fallback ?? '';
};

// Optional: log details to help debug on devices (only prints the final BASE_URL)
export const logDevNetworkDebug = (options: {
  port: number;
  fallback?: string;
  envVarName?: string;
  resolved?: string;
}): void => {
  if (!__DEV__) return;
  const { port, fallback, envVarName = 'EXPO_PUBLIC_API_BASE_URL', resolved } = options;
  const computed = resolved ?? resolveDevBaseUrl(port, fallback, envVarName);
  // eslint-disable-next-line no-console
  console.log('BASE_URL:', computed);
};
