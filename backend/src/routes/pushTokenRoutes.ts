import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { register, unregister } from '../controllers/pushTokenController';
import prisma from '../utils/prisma';

const router = Router();
router.use(authenticate);

router.post('/register', register);
router.post('/unregister', unregister);
// Add endpoint to list user's tokens
router.get('/', async (req, res) => {
  const user = (req as any).user;
  try {
    const tokens = await prisma.pushToken.findMany({ where: { userId: user.id } });
    res.json(tokens);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get tokens' });
  }
});

export default router;
