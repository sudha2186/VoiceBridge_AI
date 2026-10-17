// VoiceBridge AI — Real Document Service with PyMuPDF OCR & Verification

export interface OcrExtractedData {
  name?: string | null;
  dob?: string | null;
  address?: string | null;
  income?: string | null;
  document_number?: string | null;
  page_count?: number;
  raw_text_snippet?: string;
}

export interface FieldComparison {
  status: 'match' | 'mismatch' | 'insufficient_document_information' | 'unreadable' | 'unavailable';
  document_value?: string | null;
  profile_value?: string | null;
  detail?: string;
}

export interface DocumentVerification {
  status: 'uploaded' | 'processing' | 'extracted' | 'verified' | 'needs_review' | 'failed';
  name_match?: boolean;
  dob_match?: boolean;
  year_only?: boolean;
  field_comparisons?: {
    name?: FieldComparison;
    date_of_birth?: FieldComparison;
    gender?: FieldComparison;
    address?: FieldComparison;
    [key: string]: FieldComparison | undefined;
  };
  details?: string[];
  disclaimer?: string;
}

export interface DocumentRecord {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  extracted_data: OcrExtractedData | null;
  verification?: DocumentVerification | null;
  created_at: string;
}

export const DOCUMENT_TYPES = [
  'Aadhaar Card',
  'PAN Card',
  'Income Certificate',
  'Caste Certificate',
  'Bank Passbook',
  'Photo',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

const BACKEND_URL = ''; // Relative proxy to Express backend

/**
 * Fetch all documents for a user from backend persistence.
 */
export async function getDocuments(userId: string): Promise<DocumentRecord[]> {
  try {
    let res = await fetch(`/api/documents?user_id=${encodeURIComponent(userId)}`);
    if (!res.ok) {
      res = await fetch(`http://127.0.0.1:3001/api/documents?user_id=${encodeURIComponent(userId)}`);
    }
    if (!res.ok) throw new Error('Failed to fetch documents');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[DocumentService] Backend fetch notice:', err);
    // Fallback to localStorage cache
    const cached = localStorage.getItem(`voicebridge_docs_${userId}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // empty
      }
    }
    return [];
  }
}

/**
 * Upload a document file, execute real PyMuPDF text extraction,
 * and verify consistency against user profile.
 */
export async function uploadDocument(
  userId: string,
  documentType: string,
  file: File,
  profile?: { full_name?: string | null; date_of_birth?: string | null; gender?: string | null },
  onProgress?: (percent: number) => void
): Promise<DocumentRecord> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);
  formData.append('document_type', documentType);
  if (profile?.full_name) formData.append('profile_name', profile.full_name);
  if (profile?.date_of_birth) formData.append('profile_dob', profile.date_of_birth);
  if (profile?.gender) formData.append('profile_gender', profile.gender);

  if (onProgress) onProgress(30);

  let res: Response;
  try {
    res = await fetch('/api/documents', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      res = await fetch('http://127.0.0.1:3001/api/documents', {
        method: 'POST',
        body: formData,
      });
    }
  } catch {
    res = await fetch('http://127.0.0.1:3001/api/documents', {
      method: 'POST',
      body: formData,
    });
  }

  if (onProgress) onProgress(80);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Document upload and OCR failed');
  }

  const newDoc: DocumentRecord = await res.json();

  if (onProgress) onProgress(100);

  // Update local cache
  try {
    const cached = localStorage.getItem(`voicebridge_docs_${userId}`);
    const list: DocumentRecord[] = cached ? JSON.parse(cached) : [];
    const updated = [newDoc, ...list.filter((d) => d.id !== newDoc.id)];
    localStorage.setItem(`voicebridge_docs_${userId}`, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return newDoc;
}

/**
 * Get display URL for a document file.
 */
export function getDocumentUrl(storagePath: string): string {
  if (storagePath.startsWith('http')) return storagePath;
  if (storagePath.startsWith('/api')) {
    // If backend is running on 3001 and vite proxies /api, relative works; fallback to port 3001
    return `http://127.0.0.1:3001${storagePath}`;
  }
  return storagePath;
}

export async function getSignedUrl(storagePath: string): Promise<string> {
  return getDocumentUrl(storagePath);
}

/**
 * Delete a document by ID.
 */
export async function deleteDocument(documentId: string, userId?: string): Promise<void> {
  try {
    let res = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' });
    if (!res.ok) {
      res = await fetch(`http://127.0.0.1:3001/api/documents/${documentId}`, { method: 'DELETE' });
    }
  } catch {
    // ignore
  }

  if (userId) {
    try {
      const cached = localStorage.getItem(`voicebridge_docs_${userId}`);
      if (cached) {
        const list: DocumentRecord[] = JSON.parse(cached);
        const filtered = list.filter((d) => d.id !== documentId);
        localStorage.setItem(`voicebridge_docs_${userId}`, JSON.stringify(filtered));
      }
    } catch {
      // ignore
    }
  }
}
