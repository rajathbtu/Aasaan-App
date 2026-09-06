import { Router } from 'express';
import { autocomplete, details, geocode } from '../controllers/googlePlacesProxyController';

const router = Router();

/**
 * Web-only proxy for Google Places Web Service endpoints.
 * Native apps continue to call Google Places APIs directly — the proxy is only
 * routed to from `frontend/src/services/googlePlacesApi.ts` when
 * Platform.OS === 'web'.
 */
router.get('/autocomplete', autocomplete);
router.get('/details', details);
router.get('/geocode', geocode);

export default router;