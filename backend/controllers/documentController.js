/**
 * VoiceBridge AI — Citizen Document Controller
 * 
 * Handles real citizen document uploads, PyMuPDF OCR text extraction via AI microservice,
 * profile consistency verification, and local/backend persistence.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DOCUMENTS_FILE = path.join(DATA_DIR, 'citizen_documents.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'documents');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DOCUMENTS_FILE)) {
  fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify([]), 'utf-8');
}

function loadDocuments() {
  try {
    if (fs.existsSync(DOCUMENTS_FILE)) {
      const content = fs.readFileSync(DOCUMENTS_FILE, 'utf-8');
      return JSON.parse(content || '[]');
    }
  } catch (err) {
    console.error('[DocumentController] Error reading documents file:', err);
  }
  return [];
}

function saveDocuments(docs) {
  try {
    fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(docs, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DocumentController] Error saving documents file:', err);
  }
}

/**
 * GET /api/documents
 * List all documents belonging to a user (filter by query param or auth)
 */
export function listDocuments(req, res) {
  const userId = req.query.user_id || req.user?.id || req.headers['x-user-id'];
  const allDocs = loadDocuments();
  if (userId) {
    const userDocs = allDocs.filter((d) => d.user_id === userId);
    return res.json(userDocs);
  }
  return res.json(allDocs);
}

/**
 * GET /api/documents/:id
 * Get single document record
 */
export function getDocument(req, res) {
  const { id } = req.params;
  const allDocs = loadDocuments();
  const doc = allDocs.find((d) => d.id === id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  return res.json(doc);
}

/**
 * GET /api/documents/file/:filename
 * Serve uploaded document file
 */
export function downloadDocumentFile(req, res) {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_DIR, path.basename(filename));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  return res.sendFile(filePath);
}

/**
 * POST /api/documents
 * Upload document file, run PyMuPDF OCR extraction and profile verification
 */
export async function uploadDocument(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file uploaded' });
    }

    const userId = req.body.user_id || req.user?.id || 'anonymous_user';
    const documentType = req.body.document_type || 'Aadhaar Card';
    const profileName = req.body.profile_name || '';
    const profileDob = req.body.profile_dob || '';
    const profileGender = req.body.profile_gender || '';

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;
    const storagePath = `/api/documents/file/${path.basename(filePath)}`;

    let extractedData = null;
    let verification = null;

    // Call Python AI microservice for PyMuPDF text & entity extraction
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const formData = new FormData();
      const fileBlob = new Blob([fileBuffer], { type: req.file.mimetype || 'application/pdf' });
      formData.append('pdf', fileBlob, originalName);
      formData.append('document_type', documentType);
      if (profileName) formData.append('profile_name', profileName);
      if (profileDob) formData.append('profile_dob', profileDob);
      if (profileGender) formData.append('profile_gender', profileGender);

      const aiRes = await fetch(`${aiServiceUrl}/api/ocr/extract-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        if (aiJson.success) {
          extractedData = aiJson.extracted_data;
          verification = aiJson.verification;
        }
      }
    } catch (aiErr) {
      console.warn('[DocumentController] AI OCR service notice:', aiErr.message);
    }

    // Default structure if AI extraction had no selectable text or failed
    if (!extractedData) {
      extractedData = {
        name: null,
        dob: null,
        birth_year: null,
        dob_type: null,
        document_number: null,
        income: null,
        category: null,
        caste: null,
        financial_year: null,
        issuing_authority: null,
        raw_text_snippet: '',
      };
      verification = {
        status: 'failed',
        name_match: false,
        dob_match: false,
        field_comparisons: {
          name: { status: 'unreadable', detail: 'Could not extract text from document. Please upload a clear document.' },
          date_of_birth: { status: 'unreadable', detail: 'Could not extract text from document.' }
        },
        details: ['No readable text could be extracted from document. Please ensure document is not blurry or password-protected.'],
        disclaimer: 'Text consistency verification against profile details completed. Official legal authenticity requires issuing authority or DigiLocker verification.',
      };
    }

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newDoc = {
      id: docId,
      user_id: userId,
      document_type: documentType,
      file_name: originalName,
      storage_path: storagePath,
      file_size: fileSize,
      extracted_data: extractedData,
      verification,
      created_at: new Date().toISOString(),
    };

    const allDocs = loadDocuments();
    allDocs.unshift(newDoc);
    saveDocuments(allDocs);

    return res.status(201).json(newDoc);
  } catch (error) {
    console.error('[DocumentController] Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload document', details: error.message });
  }
}

/**
 * DELETE /api/documents/:id
 * Remove document and local file
 */
export function deleteDocument(req, res) {
  const { id } = req.params;
  const allDocs = loadDocuments();
  const docIdx = allDocs.findIndex((d) => d.id === id);
  if (docIdx === -1) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const [removed] = allDocs.splice(docIdx, 1);
  saveDocuments(allDocs);

  // Attempt to delete file from disk if local
  if (removed.storage_path) {
    const filename = path.basename(removed.storage_path);
    const diskPath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(diskPath)) {
      try {
        fs.unlinkSync(diskPath);
      } catch (e) {
        console.warn('[DocumentController] Could not remove file on disk:', e.message);
      }
    }
  }

  return res.json({ success: true, message: 'Document deleted successfully', id });
}
