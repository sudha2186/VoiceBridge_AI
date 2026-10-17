/**
 * PDF routes — PLACEHOLDER.
 * Maps /api/pdf/* to the PDF generation controller.
 * Requires JWT auth.
 */

import { Router } from 'express';
import { generatePdf, downloadPdf } from '../controllers/pdfController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/generate/:applicationId', protect, generatePdf);   // PLACEHOLDER
router.get('/download/:applicationId', protect, downloadPdf);    // PLACEHOLDER

export default router;
