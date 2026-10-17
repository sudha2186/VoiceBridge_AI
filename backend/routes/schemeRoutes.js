/**
 * Scheme routes — maps /api/schemes/* to controller functions.
 * Read endpoints are public; write endpoints will require admin auth (future).
 */

import { Router } from 'express';
import {
  listSchemes,
  getScheme,
  createScheme,
  updateScheme,
  deleteScheme,
} from '../controllers/schemeController.js';

const router = Router();

router.get('/', listSchemes);             // PLACEHOLDER
router.get('/:id', getScheme);            // PLACEHOLDER
router.post('/', createScheme);           // PLACEHOLDER (admin)
router.put('/:id', updateScheme);         // PLACEHOLDER (admin)
router.delete('/:id', deleteScheme);      // PLACEHOLDER (admin)

export default router;
