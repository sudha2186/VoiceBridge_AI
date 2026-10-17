/**
 * Chat routes — PLACEHOLDER.
 * Maps /api/chat/* to the AI assistant controller.
 * Requires JWT auth.
 */

import { Router } from 'express';
import { sendMessage, getHistory } from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/message', protect, sendMessage);   // PLACEHOLDER — AI chat
router.get('/history', protect, getHistory);     // PLACEHOLDER

export default router;
