import type { OcrExtractedData, DocumentVerification } from './documentService';

export interface OcrResult {
  success: boolean;
  extracted_data: OcrExtractedData;
  verification: DocumentVerification;
}

/**
 * Real PDF OCR and entity extraction using PyMuPDF microservice.
 * Extracts text, structured entities (Name, DOB, ID, Income),
 * and verifies consistency against profile details.
 */
export async function extractPdfOcr(
  file: File,
  documentType: string,
  profile?: { full_name?: string | null; date_of_birth?: string | null; gender?: string | null }
): Promise<OcrResult> {
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('document_type', documentType);
  if (profile?.full_name) formData.append('profile_name', profile.full_name);
  if (profile?.date_of_birth) formData.append('profile_dob', profile.date_of_birth);
  if (profile?.gender) formData.append('profile_gender', profile.gender);

  let res: Response;
  try {
    res = await fetch('http://127.0.0.1:8000/api/ocr/extract-pdf', {
      method: 'POST',
      body: formData,
    });
  } catch {
    res = await fetch('/api/ocr/extract-pdf', {
      method: 'POST',
      body: formData,
    });
  }

  if (!res.ok) {
    throw new Error('PDF OCR extraction request failed.');
  }

  return await res.json();
}
