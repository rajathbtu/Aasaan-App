import { Request, Response } from 'express';
import https from 'https';

/**
 * Server-side proxy for Google Places Web Service endpoints.
 *
 * Background:
 *  - Google's /maps/api/place/* and /maps/api/geocode endpoints do NOT
 *    send CORS headers. They cannot be called directly from a browser.
 *  - Native apps (iOS/Android) are not subject to CORS, so they can hit
 *    Google directly. That code path is unchanged.
 *
 * This proxy lets the web build of the Expo app reach the same Google
 * endpoints through our own backend, which sets permissive CORS headers
 * for the dev / Expo-tunnel origins already whitelisted in app.ts.
 *
 * The Google API key is read from the server environment so it never has
 * to live in the browser bundle (and the browser never sees it).
 */

type Endpoint = 'autocomplete' | 'details' | 'geocode';

const ENDPOINT_PATHS: Record<Endpoint, string> = {
  autocomplete: '/maps/api/place/autocomplete/json',
  details: '/maps/api/place/details/json',
  geocode: '/maps/api/geocode/json',
};

const getApiKey = (): string | null => {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  return key && key.length > 0 ? key : null;
};

/**
 * Build the upstream URL by stripping `key` and `callback` from the
 * incoming query, then appending the server-side API key.
 *
 * Only the params Google expects are forwarded — anything else (e.g.
 * `components`, `place_id`, `latlng`, `input`) is passed through as-is.
 */
const buildUpstreamUrl = (endpoint: Endpoint, query: Record<string, unknown>): string => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v == null) continue;
    if (k === 'key' || k === 'callback') continue; // server-controlled
    params.append(k, String(v));
  }
  const apiKey = getApiKey();
  if (apiKey) params.append('key', apiKey);

  const qs = params.toString();
  return `https://maps.googleapis.com${ENDPOINT_PATHS[endpoint]}${qs ? `?${qs}` : ''}`;
};

const httpsGetJson = (url: string): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Accept: 'application/json' } }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy(new Error('Upstream Google Places request timed out'));
    });
  });

const proxy =
  (endpoint: Endpoint) =>
  async (req: Request, res: Response): Promise<void> => {
    if (!getApiKey()) {
      res.status(500).json({
        status: 'REQUEST_DENIED',
        error_message:
          'Server is missing GOOGLE_PLACES_API_KEY. Set it in backend/.env so the web build can proxy Google Places calls.',
      });
      return;
    }

    try {
      const upstream = buildUpstreamUrl(endpoint, req.query as Record<string, unknown>);
      const { status, body } = await httpsGetJson(upstream);
      // Forward Google's status (200 on success, 200 with error status field on logical failures)
      res.status(status >= 200 && status < 300 ? 200 : status).type('application/json').send(body);
    } catch (err: any) {
      res.status(502).json({
        status: 'UPSTREAM_ERROR',
        error_message: err?.message ?? 'Failed to reach Google Places',
      });
    }
  };

export const autocomplete = proxy('autocomplete');
export const details = proxy('details');
export const geocode = proxy('geocode');