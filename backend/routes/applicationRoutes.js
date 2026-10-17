/**
 * Application routes — maps /api/applications/* to controller functions.
 * All routes require JWT auth (citizen only sees their own applications).
 */

import { Router } from 'express';
import {
  listApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../controllers/applicationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', protect, listApplications);           // PLACEHOLDER
router.get('/:id', protect, getApplication);          // PLACEHOLDER
router.post('/', protect, createApplication);         // PLACEHOLDER
router.put('/:id', protect, updateApplication);       // PLACEHOLDER
router.delete('/:id', protect, deleteApplication);    // PLACEHOLDER

export default router;
