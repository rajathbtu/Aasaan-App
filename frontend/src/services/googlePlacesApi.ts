import { Platform } from 'react-native';
import axios from 'axios';
import { GOOGLE_PLACES_API_KEY, BASE_URL } from '../config';

/**
 * Wrapper for Google Places Web Service calls.
 *
 * Why this exists:
 *   - Google's `/maps/api/place/*` and `/maps/api/geocode` endpoints do
 *     NOT send CORS headers, so the browser blocks direct calls from
 *     the Expo mWeb build (the symptom in the original bug report).
 *   - Native apps (iOS/Android) are not subject to CORS, so calling
 *     Google directly still works there.
 *
 * Behaviour:
 *   - On web: every call goes through the backend proxy at
 *     `${BASE_URL}/google-places/<endpoint>`. The proxy is implemented
 *     in `backend/src/controllers/googlePlacesProxyController.ts`.
 *   - On native: calls go straight to Google with the API key (same as
 *     before — no change for iOS/Android users).
 *
 * Each helper returns the parsed JSON body so callers can keep reading
 * `data.predictions`, `data.result`, etc.
 */

const isWeb = Platform.OS === 'web';

/** Build a Google URL for a given Web Service path, appending the key. */
const nativeGoogleUrl = (
  pathAfterMapsApi: string,
  params: Record<string, string | number | undefined>
) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    qs.append(k, String(v));
  }
  qs.append('key', GOOGLE_PLACES_API_KEY);
  return `https://maps.googleapis.com/maps/api/${pathAfterMapsApi}?${qs.toString()}`;
};

const webGet = async <T>(
  endpoint: string,
  params: Record<string, string | number | undefined>
): Promise<T> => {
  const url = `${BASE_URL}/google-places/${endpoint}`;
  const res = await axios.get(url, {
    params,
    // BASE_URL on dev is an ngrok tunnel — skip its browser warning
    // interstitial (matches the existing /api behaviour).
    headers: { 'ngrok-skip-browser-warning': 'true' },
  });
  return res.data as T;
};

const nativeGet = async <T>(url: string): Promise<T> => {
  const res = await axios.get(url);
  return res.data as T;
};

export type AutocompleteParams = {
  input: string;
  components?: string;
  sessiontoken?: string;
};

export type PlaceDetailsParams = {
  place_id: string;
  fields?: string;
  sessiontoken?: string;
};

export type GeocodeParams = {
  latlng: string;
};

export const placesAutocomplete = (params: AutocompleteParams) =>
  isWeb
    ? webGet<{ predictions: any[]; status: string }>('autocomplete', {
        input: params.input,
        components: params.components,
        sessiontoken: params.sessiontoken,
      })
    : nativeGet<{ predictions: any[]; status: string }>(
        nativeGoogleUrl('place/autocomplete/json', {
          input: params.input,
          components: params.components,
          sessiontoken: params.sessiontoken,
        })
      );

export const placeDetails = (params: PlaceDetailsParams) =>
  isWeb
    ? webGet<{ result: any; status: string }>('details', {
        place_id: params.place_id,
        fields: params.fields,
        sessiontoken: params.sessiontoken,
      })
    : nativeGet<{ result: any; status: string }>(
        nativeGoogleUrl('place/details/json', {
          place_id: params.place_id,
          fields: params.fields,
          sessiontoken: params.sessiontoken,
        })
      );

export const reverseGeocode = (params: GeocodeParams) =>
  isWeb
    ? webGet<{ results: any[]; status: string }>('geocode', { latlng: params.latlng })
    : nativeGet<{ results: any[]; status: string }>(
        nativeGoogleUrl('geocode/json', { latlng: params.latlng })
      );