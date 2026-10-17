/**
 * VoiceBridge AI — Document Routes
 * Maps /api/documents/* to real document handling controller functions with Multer file upload.
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  listDocuments,
  getDocument,
  uploadDocument,
  deleteDocument,
  downloadDocumentFile,
} from '../controllers/documentController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'documents');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname) || '.pdf';
    const uniqueName = `doc_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// Middleware to accept either 'file' or 'document' field seamlessly
const uploadMiddleware = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) return next(err);
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

const router = Router();

router.get('/', listDocuments);
router.get('/file/:filename', downloadDocumentFile);
router.get('/:id', getDocument);
router.post('/upload', uploadMiddleware, uploadDocument);
router.post('/', uploadMiddleware, uploadDocument);
router.delete('/:id', deleteDocument);

export default router;
