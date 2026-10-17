/**
 * Auth routes — maps /api/auth/* to controller functions.
 * All routes here are public except /me, which requires the JWT middleware.
 */

import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);       // PLACEHOLDER
router.post('/login', login);             // PLACEHOLDER
router.get('/me', protect, getMe);

export default router;
