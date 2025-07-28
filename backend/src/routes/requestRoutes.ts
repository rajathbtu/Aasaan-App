import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { create, list, getById, accept, close } from '../controllers/requestController';

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
// Close a work request (end user only)
router.put('/:id/close', close);

export default router;