import { Router } from 'express';
import { listServices } from '../controllers/serviceController';

const router = Router();

// GET /services -> list available services (seed if empty)
router.get('/', listServices);

export default router;
