import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { create, list, getById, accept, undoAccept, close, rateEndUser } from '../controllers/requestController';

const router = Router();

router.use(authenticate);

// Create a work request
router.post('/', create);
// List work requests relevant to the authenticated user
router.get('/', list);
// Get a specific work request
router.get('/:id', getById);
// Accept a work request (service provider only)
router.put('/:id/accept', accept);
// Undo a provider's acceptance while the request is active
router.delete('/:id/accept', undoAccept);
// Close a work request (end user only)
router.put('/:id/close', close);
// Rate the end user after a selected provider's work request is closed
router.put('/:id/rate-end-user', rateEndUser);

export default router;