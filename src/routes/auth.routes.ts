
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/me', authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication successful',
    data: req.authUser,
  });
});

export default router;
